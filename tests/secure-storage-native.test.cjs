const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const source = fs.readFileSync(
  path.join(__dirname, '../apple/Sources/SecureStorage/RNWSecureStorage.mm'),
  'utf8'
);

test(
  'native query rejects invalid configuration and pins service/account/group',
  { skip: process.platform !== 'darwin' },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rnw-storage-native-'));
    try {
      // Compile the actual query helper without React Native bridge dependencies.
      const helper = source.slice(
        source.indexOf('static NSString *const kRNWSecureStorageService'),
        source.indexOf('static NSString *RNWSecureStorageStatusMessage')
      );
      const harness = `
#import <Foundation/Foundation.h>
#import <Security/Security.h>
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
static id configuredGroup;
@interface TestBundle : NSObject
+ (instancetype)mainBundle;
- (id)objectForInfoDictionaryKey:(NSString *)key;
@end
@implementation TestBundle
+ (instancetype)mainBundle { return [TestBundle new]; }
- (id)objectForInfoDictionaryKey:(NSString *)key { return configuredGroup; }
@end
#define NSBundle TestBundle
${helper}
int main() {
  @autoreleasepool {
    __block int rejected = 0;
    RCTPromiseRejectBlock reject = ^(NSString *code, NSString *message, NSError *error) {
      assert([code isEqualToString:@"keychain_configuration_error"]);
      rejected++;
    };
    for (id invalid in @[@"", @42, @"$(AppIdentifierPrefix)app", @"\u0024{PREFIX}app", @".app", @" group "]) {
      configuredGroup = invalid;
      assert(RNWSecureStorageQuery(@"key", reject) == nil);
    }
    configuredGroup = nil;
    assert(RNWSecureStorageQuery(@"key", reject) == nil);
    assert(rejected == 7);
    configuredGroup = @"PREFIX.shared";
    NSDictionary *query = RNWSecureStorageQuery(@"seed", reject);
    assert([query[(__bridge id)kSecAttrAccessGroup] isEqual:@"PREFIX.shared"]);
    assert([query[(__bridge id)kSecAttrService] isEqual:@"co.appsent.reactnativewatchos.securestorage"]);
    assert([query[(__bridge id)kSecAttrAccount] isEqual:@"seed"]);
    assert([query[(__bridge id)kSecClass] isEqual:(__bridge id)kSecClassGenericPassword]);
    assert([query[(__bridge id)kSecAttrSynchronizable] isEqual:@NO]);
  }
  return 0;
}`;
      const file = path.join(dir, 'query.mm');
      fs.writeFileSync(file, harness);
      const binary = path.join(dir, 'query');
      execFileSync(
        'xcrun',
        [
          'clang++',
          '-fobjc-arc',
          '-fblocks',
          '-framework',
          'Foundation',
          '-framework',
          'Security',
          file,
          '-o',
          binary,
        ],
        { stdio: 'pipe' }
      );
      execFileSync(binary, [], { stdio: 'pipe' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
);
