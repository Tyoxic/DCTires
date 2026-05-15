// Dynamic config wrapper around app.json. Lets us inject the GitHub PAT
// (used for in-app update checks against the private Tyoxic/DCTires repo)
// from an EAS environment variable so it never lives in git.
//
// EAS Build / `eas update` set DCTIRES_GITHUB_TOKEN at config-resolution time;
// the value gets baked into the JS bundle's manifest.extra.githubToken and
// is read at runtime via `Constants.expoConfig?.extra?.githubToken`.

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    githubToken: process.env.DCTIRES_GITHUB_TOKEN ?? '',
  },
});
