const { description } = require('../../package')

module.exports = {
  title: 'Simple Web Server',
  description: description,
  head: [
    ['meta', { name: 'theme-color', content: '#d09608' }]
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
            'custom request handler'
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
