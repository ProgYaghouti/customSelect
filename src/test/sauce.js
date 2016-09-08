import fs from 'fs';

import Runner from 'sauce-tap-runner';
import async from 'async';
import pkg from '../package';

function test(options, callback) {
  callback = callback || (() => {})

  if (!options) {
    throw new Error("must supply an options object")
  }

  if (!options.name) {
    throw new Error("must supply a project `name` option")
  }

  options.user = options.user || process.env.SAUCE_USERNAME
  if (!options.user) {
    throw new Error("must supply a saucelabs `user` option")
  }

  options.accessKey = options.accessKey || process.env.SAUCE_ACCESS_KEY
  if (!options.accessKey) {
    throw new Error("must supply a saucelabs `accessKey` option")
  }

  if (!options.src) {
    throw new Error("must supply a `src` file option")
  }

  if (!options.desiredCapabilities) {
    throw new Error("must supply a `desiredCapabilities` array option")
  }

  if (!options.build) {
    options.build = String(Date.now())
  }

  options.limit = options.limit || 3

  const log = options.log || console.log
  const src = fs.readFileSync(options.src, {encoding: "utf-8"})

  const tests = new Runner(options.user, options.accessKey)

  tests.on("tunnel-connect", () => log("# Starting to connect the Sauce Connect tunnel..."))
  tests.on("tunnel", (tunnel) => log("# The Sauce Connect tunnel has been connected!"))
  tests.on("tunnel-error", (e) => log("# An error occurred when connecting the Sauce Connect tunnel"))
  tests.on("browser", (browser) => log("# Successfully connected to a new browser"))
  tests.on("results", (results) => log("# Test run has finished"))
  tests.on("close", () => log("# The runner has been closed"))

  const runs = options.desiredCapabilities.map(
    (capabilities) => {
      const comboName =
        `${capabilities.platform} ${capabilities.browserName} ` +
        `${capabilities.version || "latest"}`
      capabilities = {
        ...capabilities,
          name: `${options.name} ${comboName}`,
        "capture-html": true,
        build: options.build,
      }
      return (cb) => {
        log()
        log()
        log(`# Running ${comboName}...`)
        log()

        tests.run(
          src,
          capabilities,
          options.options || {},
          (err, results) => {
            if (err) {throw err}

            log()
            log()
            log(`# ${capabilities.name}`)
            log()

            log(colorTap(results.raw))
            log()

            cb(null, results)
          }
        )
      }
    }
  )

  // we could imagine to run parallel tests
  // https://github.com/conradz/sauce-tap-runner/issues/2
  // async.parallelLimit(
  async.series(
    runs,
    // if parallel can be used, this arguments must be added
    // options.limit,
    (err, results) => {
      if (err) {throw err}

      // TODO: add a summary

      const allOk = results.some((result) => result.ok)

      log("# All tests run completed")

      tests.close(() => {
        if (callback) {
          return callback(err)
        }
      })
    }
  )
}

test({
  name: pkg.name,
  user: "custom-select",
  accessKey: "d5276d0e-2b8e-4088-ade3-6bdba28cdc95",
  src: 'src/test/index.js',
  desiredCapabilities: [
    {
      browserName: 'internet explorer',
      platform: 'Windows 8.1',
      version: '11',
    },
    {
      browserName: 'chrome',
      platform: 'Windows 8.1',
    },
    {
      browserName: 'firefox',
      platform: 'Windows 8.1',
    },
    {
      browserName: 'safari',
      platform: 'OS X 10.10',
    },
    {
      browserName: 'iphone',
    },
    {
      browserName: 'ipad',
    },
  ],
  options: {
    timeout: 60 * 1000,
  },
})