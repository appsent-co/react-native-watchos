#import "RNWUIManager.h"

#import <ReactCommon/RCTTurboModule.h>

#include <algorithm>
#include <cstdint>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace jsi = facebook::jsi;
using facebook::react::CallInvoker;
using facebook::react::TurboModuleConvertUtils::convertJSIValueToObjCObject;

namespace {

using Tag = uint32_t;

struct MutableNode {
    Tag tag = 0;
    RNWNodeKind kind = RNWNodeKindView;
    NSString *viewName = nil;
    NSDictionary<NSString *, id> *props = nil;
    NSArray<NSDictionary<NSString *, id> *> *modifiers = nil;
    NSDictionary<NSString *, NSNumber *> *eventHandlers = nil;
    std::string text;
    std::vector<Tag> children;
};

struct Registry {
    std::unordered_map<Tag, std::shared_ptr<MutableNode>> nodes;
    std::vector<Tag> rootChildren;
    Tag nextTag = 1;
};

bool isEventHandlerKey(NSString *key) {
    if (key.length < 3) return false;
    if ([key characterAtIndex:0] != 'o') return false;
    if ([key characterAtIndex:1] != 'n') return false;
    unichar c = [key characterAtIndex:2];
    return c >= 'A' && c <= 'Z';
}

struct ParsedProps {
    NSDictionary<NSString *, id> *props;
    NSArray<NSDictionary<NSString *, id> *> *modifiers;
    NSDictionary<NSString *, NSNumber *> *eventHandlers;
};

// `children` and `$$typeof`-carrying values are dropped: React Fibers carry
// parent pointers that form cycles, so recursing into them via
// `convertJSIValueToObjCObject` blows the stack. Siblings already reach the
// tree through `appendChild`.
ParsedProps parseProps(jsi::Runtime &rt,
                       const jsi::Value &value,
                       const std::shared_ptr<CallInvoker> &jsInvoker) {
    ParsedProps out = { @{}, @[], @{} };
    if (!value.isObject()) return out;
    jsi::Object obj = value.getObject(rt);
    if (obj.isFunction(rt) || obj.isArray(rt)) return out;

    NSMutableDictionary<NSString *, id> *props = [NSMutableDictionary dictionary];
    NSMutableDictionary<NSString *, NSNumber *> *events =
        [NSMutableDictionary dictionary];
    NSArray *modifiers = @[];

    jsi::Array names = obj.getPropertyNames(rt);
    size_t n = names.size(rt);
    for (size_t i = 0; i < n; ++i) {
        std::string keyStr =
            names.getValueAtIndex(rt, i).getString(rt).utf8(rt);

        if (keyStr == "children") continue;

        NSString *key = [NSString stringWithUTF8String:keyStr.c_str()];
        jsi::Value v = obj.getProperty(rt, keyStr.c_str());

        if (keyStr == "modifiers") {
            id arr = convertJSIValueToObjCObject(rt, v, jsInvoker, NO);
            if ([arr isKindOfClass:[NSArray class]]) {
                modifiers = (NSArray *)arr;
            }
            continue;
        }
        if (isEventHandlerKey(key) && v.isNumber()) {
            events[key] = @(v.getNumber());
            continue;
        }
        if (v.isObject() && v.getObject(rt).hasProperty(rt, "$$typeof")) {
            continue;
        }

        id converted = convertJSIValueToObjCObject(rt, v, jsInvoker, NO);
        if (converted != nil) {
            props[key] = converted;
        }
    }

    out.props = props;
    out.modifiers = modifiers;
    out.eventHandlers = events;
    return out;
}

RNWShadowNodeSnapshot *snapshotNode(const Registry &reg, Tag tag) {
    auto it = reg.nodes.find(tag);
    if (it == reg.nodes.end()) return nil;
    const MutableNode &n = *it->second;

    NSMutableArray<RNWShadowNodeSnapshot *> *children =
        [NSMutableArray arrayWithCapacity:n.children.size()];
    for (Tag childTag : n.children) {
        RNWShadowNodeSnapshot *child = snapshotNode(reg, childTag);
        if (child != nil) {
            [children addObject:child];
        }
    }

    NSString *text = nil;
    if (n.kind == RNWNodeKindRawText) {
        text = [NSString stringWithUTF8String:n.text.c_str()];
    }

    return [[RNWShadowNodeSnapshot alloc] initWithTag:(NSInteger)tag
                                                 kind:n.kind
                                             viewName:n.viewName
                                                props:n.props
                                            modifiers:n.modifiers
                                        eventHandlers:n.eventHandlers
                                                 text:text
                                             children:children];
}

template <typename F>
void installFn(jsi::Runtime &rt,
               jsi::Object &target,
               const char *name,
               unsigned paramCount,
               F &&fn) {
    target.setProperty(
        rt,
        name,
        jsi::Function::createFromHostFunction(
            rt,
            jsi::PropNameID::forAscii(rt, name),
            paramCount,
            std::forward<F>(fn)));
}

// Reconciler removes a subtree by only unlinking the top — descendants must
// be reclaimed here or they leak.
void eraseSubtree(Registry &reg, Tag tag) {
    auto it = reg.nodes.find(tag);
    if (it == reg.nodes.end()) return;
    // Copy before erasing the parent — it owns the vector.
    std::vector<Tag> children = it->second->children;
    reg.nodes.erase(it);
    for (Tag child : children) {
        eraseSubtree(reg, child);
    }
}

} // namespace

void rnwInstallUIManager(jsi::Runtime &rt,
                         std::shared_ptr<CallInvoker> jsInvoker,
                         void (^onCommit)(NSArray<RNWShadowNodeSnapshot *> *)) {
    auto reg = std::make_shared<Registry>();
    void (^commit)(NSArray<RNWShadowNodeSnapshot *> *) = [onCommit copy];

    jsi::Object api(rt);

    installFn(rt, api, "createNode", 2,
        [reg, jsInvoker](jsi::Runtime &rt,
                         const jsi::Value &,
                         const jsi::Value *args,
                         size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isString()) {
                throw jsi::JSError(rt, "createNode: expected (string, object)");
            }
            std::string type = args[0].getString(rt).utf8(rt);
            ParsedProps parsed = parseProps(rt, args[1], jsInvoker);

            auto node = std::make_shared<MutableNode>();
            node->tag = reg->nextTag++;
            node->kind = RNWNodeKindView;
            node->viewName = [NSString stringWithUTF8String:type.c_str()];
            node->props = parsed.props;
            node->modifiers = parsed.modifiers;
            node->eventHandlers = parsed.eventHandlers;
            reg->nodes.emplace(node->tag, node);
            return jsi::Value(static_cast<double>(node->tag));
        });

    installFn(rt, api, "createTextNode", 1,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(rt, "createTextNode: expected (string)");
            }
            auto node = std::make_shared<MutableNode>();
            node->tag = reg->nextTag++;
            node->kind = RNWNodeKindRawText;
            node->text = args[0].getString(rt).utf8(rt);
            reg->nodes.emplace(node->tag, node);
            return jsi::Value(static_cast<double>(node->tag));
        });

    installFn(rt, api, "updateNodeProps", 2,
        [reg, jsInvoker](jsi::Runtime &rt,
                         const jsi::Value &,
                         const jsi::Value *args,
                         size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isNumber()) return jsi::Value::undefined();
            Tag tag = static_cast<Tag>(args[0].getNumber());
            auto it = reg->nodes.find(tag);
            if (it == reg->nodes.end()) return jsi::Value::undefined();
            MutableNode &n = *it->second;
            if (n.kind != RNWNodeKindView) return jsi::Value::undefined();
            ParsedProps parsed = parseProps(rt, args[1], jsInvoker);
            n.props = parsed.props;
            n.modifiers = parsed.modifiers;
            n.eventHandlers = parsed.eventHandlers;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "updateTextNode", 2,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isNumber() || !args[1].isString()) {
                return jsi::Value::undefined();
            }
            Tag tag = static_cast<Tag>(args[0].getNumber());
            auto it = reg->nodes.find(tag);
            if (it == reg->nodes.end()) return jsi::Value::undefined();
            it->second->text = args[1].getString(rt).utf8(rt);
            return jsi::Value::undefined();
        });

    installFn(rt, api, "appendChild", 2,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isNumber() || !args[1].isNumber()) {
                return jsi::Value::undefined();
            }
            Tag parent = static_cast<Tag>(args[0].getNumber());
            Tag child  = static_cast<Tag>(args[1].getNumber());
            auto it = reg->nodes.find(parent);
            if (it == reg->nodes.end()) return jsi::Value::undefined();
            // Reparenting: detach from previous position first.
            auto &siblings = it->second->children;
            siblings.erase(
                std::remove(siblings.begin(), siblings.end(), child),
                siblings.end());
            siblings.push_back(child);
            (void)rt;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "insertBefore", 3,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 3 || !args[0].isNumber() || !args[1].isNumber() ||
                !args[2].isNumber()) {
                return jsi::Value::undefined();
            }
            Tag parent = static_cast<Tag>(args[0].getNumber());
            Tag child  = static_cast<Tag>(args[1].getNumber());
            Tag before = static_cast<Tag>(args[2].getNumber());
            auto it = reg->nodes.find(parent);
            if (it == reg->nodes.end()) return jsi::Value::undefined();
            auto &siblings = it->second->children;
            // Reparenting/reorder: detach first.
            siblings.erase(
                std::remove(siblings.begin(), siblings.end(), child),
                siblings.end());
            auto pos = std::find(siblings.begin(), siblings.end(), before);
            siblings.insert(pos, child);
            (void)rt;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "removeChild", 2,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isNumber() || !args[1].isNumber()) {
                return jsi::Value::undefined();
            }
            Tag parent = static_cast<Tag>(args[0].getNumber());
            Tag child  = static_cast<Tag>(args[1].getNumber());
            auto it = reg->nodes.find(parent);
            if (it != reg->nodes.end()) {
                auto &siblings = it->second->children;
                siblings.erase(
                    std::remove(siblings.begin(), siblings.end(), child),
                    siblings.end());
            }
            eraseSubtree(*reg, child);
            (void)rt;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "appendToRoot", 1,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isNumber()) return jsi::Value::undefined();
            Tag child = static_cast<Tag>(args[0].getNumber());
            auto &roots = reg->rootChildren;
            roots.erase(std::remove(roots.begin(), roots.end(), child),
                        roots.end());
            roots.push_back(child);
            (void)rt;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "removeFromRoot", 1,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *args,
              size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isNumber()) return jsi::Value::undefined();
            Tag child = static_cast<Tag>(args[0].getNumber());
            auto &roots = reg->rootChildren;
            roots.erase(std::remove(roots.begin(), roots.end(), child),
                        roots.end());
            eraseSubtree(*reg, child);
            (void)rt;
            return jsi::Value::undefined();
        });

    installFn(rt, api, "clearRoot", 0,
        [reg](jsi::Runtime &rt,
              const jsi::Value &,
              const jsi::Value *,
              size_t) -> jsi::Value {
            std::vector<Tag> roots = reg->rootChildren;
            reg->rootChildren.clear();
            for (Tag t : roots) {
                eraseSubtree(*reg, t);
            }
            (void)rt;
            return jsi::Value::undefined();
        });

    // Snapshot the mutable tree and dispatch onto main — SwiftUI state
    // updates must happen there.
    installFn(rt, api, "completeRoot", 0,
        [reg, commit](jsi::Runtime &rt,
                      const jsi::Value &,
                      const jsi::Value *,
                      size_t) -> jsi::Value {
            NSMutableArray<RNWShadowNodeSnapshot *> *snap =
                [NSMutableArray arrayWithCapacity:reg->rootChildren.size()];
            for (Tag t : reg->rootChildren) {
                RNWShadowNodeSnapshot *node = snapshotNode(*reg, t);
                if (node != nil) {
                    [snap addObject:node];
                }
            }
            if (commit != nil) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    commit(snap);
                });
            }
            (void)rt;
            return jsi::Value::undefined();
        });

    rt.global().setProperty(rt, "__RNW_UI", api);
}
