/* eslint-disable import/no-extraneous-dependencies */

const inPlace = require('metalsmith-in-place');
const layouts = require('@metalsmith/layouts');
const drafts = require('@metalsmith/drafts');
const when = require('metalsmith-if');
const favicons = require('metalsmith-favicons');
const postcss = require('metalsmith-postcss');
const browserify = require('metalsmith-browserify');
const uglify = require('metalsmith-uglify');
const htmlMinifier = require('metalsmith-html-minifier');
const imagemin = require('metalsmith-imagemin');
const metalsmith = require('metalsmith');
const hljs = require('highlight.js');
const examples = require('./lib/data/examples.json');
const plugins = require('./lib/data/plugins.json');

hljs.configure({ classPrefix: 'hljs-' });

const nodeVersion = process.version;
const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/?$/;
const oneWeek = 7 * 24 * 60 * 60;

const mappedPlugins = plugins.map(plugin => {
  if (!plugin.status) {
    plugin.status = 'active';
  }
  const result = githubRegex.exec(plugin.repository);

  if (result) {
    const [, user, repo] = result;
    const npm = plugin.npm || repo;

    Object.assign(plugin, {
      respositoryIssues: `${plugin.repository}/issues`,
      npmName: npm,
      npmUrl: `https://www.npmjs.com/package/${npm}`,
      npmDownloads: `https://img.shields.io/npm/dy/${npm}.svg?maxAge=${oneWeek}`,
      npmVersion: `https://img.shields.io/npm/v/${npm}.svg?maxAge=${oneWeek}`,
      githubStars: `https://img.shields.io/github/stars/${user}/${repo}.svg?maxAge=${oneWeek}`,
      isCorePlugin: user === 'metalsmith',
      isUnmaintained: plugin.status !== 'active'
    });
  }

  return plugin;
});

const isProduction = process.env.NODE_ENV === 'production';

metalsmith(__dirname)
  .metadata({
    placeholderBadgeUrl: 'https://img.shields.io/badge/badge-loading-lightgrey.svg?style=flat',
    plugins: mappedPlugins,
    examples,
    nodeVersion,
    cookieMessage: [
      'This website may use local storage for purely functional purposes (for example to remember preferences),',
      'and anonymous cookies to gather information about how visitors use the site.',
      'By continuing to browse this site, you agree to its use of cookies and local storage.'
    ].join(' ')
  })
  .use(when(isProduction, drafts()))
  .use(
    when(
      isProduction,
      favicons({
        src: 'favicons/favicon.png',
        dest: 'favicons/',
        icons: {
          android: true,
          appleIcon: true,
          favicons: true
        }
      })
    )
  )
  .use(
    inPlace({
      engineOptions: {
        smartypants: true,
        smartLists: true,
        highlight: function highlight(code, lang) {
          const result = hljs.highlight(code, { language: lang });
          return result.value;
        }
      },
      pattern: '**/*.md'
    })
  )
  .use(
    layouts({
      directory: 'lib/views',
      pattern: '**/*.html'
    })
  )
  .use(
    browserify({
      entries: ['index.js']
    })
  )
  .use(
    postcss({
      plugins: [
        'postcss-easy-import',
        'postcss-custom-media',
        'postcss-preset-env',
        {
          'postcss-normalize': { forceImport: true }
        },
        'autoprefixer',
        'cssnano'
      ],
      map: {
        inline: false
      }
    })
  )
  .use(when(isProduction, htmlMinifier()))
  .use(when(isProduction, imagemin()))
  .use(
    when(
      isProduction,
      uglify({
        sameName: true
      })
    )
  )
  .build(err => {
    if (err) {
      throw err;
    }
  });
