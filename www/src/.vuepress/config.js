const { description } = require('../../package')

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: 'Simple Web Server',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#d09608' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
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
        link: '/docs/'
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

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
