// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist').default;
const { withFinalizedMod } = require('@expo/config-plugins');
const { writeProvider } = require('../../expo-modules/autolinking.cjs');
const { versions } = require('../../expo-modules/compatibility.cjs');

const FACTORY = 'RNWExpoRuntimeBindingFactory';

function deploymentTarget(requested, enabled) {
  const value = requested || (enabled ? versions.watchos : '9.0');
  if (typeof value !== 'string' || !/^\d+(?:\.\d+){0,2}$/.test(value)) {
    throw new Error(
      '[RNW Expo modules] watchosDeploymentTarget must be a version string.'
    );
  }
  const [major, minor = 0] = value.split('.').map(Number);
  const [minimumMajor, minimumMinor] = versions.watchos.split('.').map(Number);
  if (
    enabled &&
    (major < minimumMajor || (major === minimumMajor && minor < minimumMinor))
  ) {
    throw new Error(
      `[RNW Expo modules] Expo modules require watchOS ${versions.watchos} or newer; received ${value}.`
    );
  }
  return value;
}

function configureProject(
  project,
  { platformRoot, targetName, providerFile, enabled, minimumVersion }
) {
  const targets = project.pbxNativeTargetSection();
  const targetId = Object.keys(targets).find(
    (key) =>
      !key.endsWith('_comment') &&
      targets[key].name?.replace(/^"|"$/g, '') === targetName
  );
  if (!targetId)
    throw new Error(
      `[RNW Expo modules] Watch target '${targetName}' was not found.`
    );
  const relativeFile = path.relative(platformRoot, providerFile);
  const group = project.getFirstProject().firstProject.mainGroup;
  if (project.hasFile(relativeFile))
    project.removeSourceFile(relativeFile, { target: targetId }, group);
  if (enabled)
    project.addSourceFile(
      relativeFile,
      { target: targetId, sourceTree: 'SOURCE_ROOT' },
      group
    );
  const configList =
    project.hash.project.objects.XCConfigurationList[
      targets[targetId].buildConfigurationList
    ];
  for (const ref of configList.buildConfigurations) {
    const settings =
      project.pbxXCBuildConfigurationSection()[ref.value].buildSettings;
    if (enabled) {
      const current = String(settings.WATCHOS_DEPLOYMENT_TARGET || '0')
        .replace(/^"|"$/g, '')
        .split('.')
        .map(Number);
      const minimum = minimumVersion.split('.').map(Number);
      if (
        current[0] < minimum[0] ||
        (current[0] === minimum[0] && (current[1] || 0) < (minimum[1] || 0))
      )
        settings.WATCHOS_DEPLOYMENT_TARGET = minimumVersion;
    }
  }
}

function configurePlist(plistFile, enabled) {
  const values = plist.parse(fs.readFileSync(plistFile, 'utf8'));
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new Error(
      `[RNW Expo modules] ${plistFile} must contain a dictionary.`
    );
  if (enabled) {
    if (
      values.RNWRuntimeBindingFactory &&
      values.RNWRuntimeBindingFactory !== FACTORY
    ) {
      throw new Error(
        `[RNW Expo modules] ${plistFile} already configures another RNWRuntimeBindingFactory.`
      );
    }
    values.RNWRuntimeBindingFactory = FACTORY;
  } else if (values.RNWRuntimeBindingFactory === FACTORY) {
    delete values.RNWRuntimeBindingFactory;
  }
  const text = plist.build(values) + '\n';
  if (fs.readFileSync(plistFile, 'utf8') !== text)
    fs.writeFileSync(plistFile, text);
}

const withWatchExpoModules = (
  config,
  { targetName, enabled, minimumVersion }
) =>
  withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const providerFile = path.join(
        platformRoot,
        'build/generated/rnw-expo',
        targetName,
        'RNWExpoModulesProvider.swift'
      );
      // Complete discovery and version checks before changing the native project.
      if (enabled) writeProvider(projectRoot, providerFile);
      const projects = fs
        .readdirSync(platformRoot)
        .filter((name) => name.endsWith('.xcodeproj'));
      if (projects.length !== 1)
        throw new Error(
          '[RNW Expo modules] Expected one Xcode project in the iOS directory.'
        );
      const projectFile = path.join(
        platformRoot,
        projects[0],
        'project.pbxproj'
      );
      const project = require('xcode').project(projectFile);
      project.parseSync();
      configureProject(project, {
        platformRoot,
        targetName,
        providerFile,
        enabled,
        minimumVersion,
      });
      configurePlist(
        path.join(projectRoot, 'targets', targetName, 'Info.plist'),
        enabled
      );
      fs.writeFileSync(projectFile, project.writeSync());
      if (!enabled)
        fs.rmSync(path.dirname(providerFile), { recursive: true, force: true });
      return cfg;
    },
  ]);

module.exports = withWatchExpoModules;
module.exports.deploymentTarget = deploymentTarget;
module.exports.configureProject = configureProject;
module.exports.configurePlist = configurePlist;
