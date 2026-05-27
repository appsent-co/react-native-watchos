// Walks an `objcName` C-string emitted by `RCT_EXPORT_METHOD` and
// yields the bare selector + one `RCTMethodArgument` per parameter.

#import <React/RCTModuleMethod.h>
#import <React/RCTParserUtils.h>

#import <ctype.h>

@implementation RCTMethodArgument

- (instancetype)initWithType:(NSString *)type {
    if ((self = [super init])) {
        _type = [type copy];
    }
    return self;
}

@end

// Word-boundary-aware variant of `RCTReadString`. Without the boundary
// check, `RCTReadString(&input, "nullable")` would eat the first eight
// chars of `"nullableThingy"` and leave the cursor mid-identifier.
static BOOL RCTSkipQualifierWord(const char **input, const char *word) {
    const char *start = *input;
    if (!RCTReadString(input, word)) {
        return NO;
    }
    char next = **input;
    if (isalnum((unsigned char)next) || next == '_') {
        *input = start;
        return NO;
    }
    return YES;
}

static BOOL RCTSkipTypeQualifier(const char **input) {
    return RCTSkipQualifierWord(input, "_Nullable")
        || RCTSkipQualifierWord(input, "_Nonnull")
        || RCTSkipQualifierWord(input, "_Null_unspecified")
        || RCTSkipQualifierWord(input, "nullable")
        || RCTSkipQualifierWord(input, "nonnull")
        || RCTSkipQualifierWord(input, "__unused")
        || RCTSkipQualifierWord(input, "unused");
}

static BOOL RCTParseSelectorPart(const char **input, NSMutableString *selector) {
    NSString *selectorPart;
    if (RCTParseSelectorIdentifier(input, &selectorPart)) {
        [selector appendString:selectorPart];
    }
    RCTSkipWhitespace(input);
    if (RCTReadChar(input, ':')) {
        [selector appendString:@":"];
        RCTSkipWhitespace(input);
        return YES;
    }
    return NO;
}

NSString *RCTParseMethodSignature(
    const char *input, NSArray<RCTMethodArgument *> **arguments) {
    RCTSkipWhitespace(&input);
    NSMutableArray<RCTMethodArgument *> *args = [NSMutableArray new];
    NSMutableString *selector = [NSMutableString new];
    while (RCTParseSelectorPart(&input, selector)) {
        if (RCTReadChar(&input, '(')) {
            RCTSkipWhitespace(&input);
            while (RCTSkipTypeQualifier(&input)) {
                RCTSkipWhitespace(&input);
            }
            NSString *type = RCTParseType(&input);
            RCTSkipWhitespace(&input);
            while (RCTSkipTypeQualifier(&input)) {
                RCTSkipWhitespace(&input);
            }
            [args addObject:[[RCTMethodArgument alloc] initWithType:type]];
            RCTSkipWhitespace(&input);
            RCTReadChar(&input, ')');
            RCTSkipWhitespace(&input);
        } else {
            [args addObject:[[RCTMethodArgument alloc] initWithType:@"id"]];
        }
        RCTParseArgumentIdentifier(&input, NULL);
        RCTSkipWhitespace(&input);
    }
    if (arguments != NULL) {
        *arguments = [args copy];
    }
    return selector;
}
