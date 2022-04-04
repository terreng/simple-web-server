const { description } = require('../../package')

module.exports = {
  title: 'Simple Web Server',
  description: description,
  head: [
    ['meta', { name: 'theme-color', content: '#d09608' }],
    ['meta', { name: 'msapplication-TileColor', content: '#d09608' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    ['meta', { name: 'keywords', content: 'Simple Web Server,web server,Web Server for Chrome,local web server' }]
  ],
  themeConfig: {
    sidebarDepth: 3,
    repo: '',
    editLinks: false,
    smoothScroll: true,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    nav: [
      {
        text: 'Download',
        link: '/download/',
      },
      {
        text: 'Documentation',
        link: '/docs/options.html'
      },
      {
        text: 'GitHub',
        link: 'https://github.com/terreng/simple-web-server'
      }
    ],
    sidebar: {
      '/docs/': [
        {
          title: 'Configuration',
          collapsable: false,
          children: [
            'options',
            'settings',
          ]
        },
        {
          title: 'Guides',
          collapsable: false,
          children: [
            'config file',
            'https',
            'swsaccess',
            'custom scripts',
            'custom request handler',
            'build',
            'wsc'
          ]
        }
      ],
    }
  },
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
