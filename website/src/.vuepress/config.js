import { defineUserConfig } from 'vuepress'
import { description } from '../../package.json'
import { defaultTheme } from '@vuepress/theme-default'
import { searchPlugin } from '@vuepress/plugin-search'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
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
    ['meta', { name: 'keywords', content: 'Simple Web Server,web server,Web Server for Chrome,local web server,200 ok,server,windows,macos,local http server' }],
    ['script', { type: 'module', src: '/ms-store-badge.bundled.js' }]
  ],
  locales: {
    '/': {
      lang: 'en-US',
      title: 'Simple Web Server',
      description: 'Create local web servers in just a few clicks with an easy-to-use interface. Download for Windows or macOS.'
    },
    '/zh-CN/': {
      lang: 'zh-CN',
      description: '简单易用! 只需几次点击就可以部署本地 Web 服务器。'
    },
    '/zh-TW/': {
      lang: 'zh-TW',
      description: '只需點擊幾下，即可透過易於使用的介面建立本機 Web 伺服器。'
    },
    '/es/': {
      lang: 'es',
      description: 'Cree servidores web locales con solo unos pocos clicks y con una interfaz fácil de usar.'
    },
    '/fr-FR/': {
      lang: 'fr-FR',
      description: 'Créez des serveurs Web locaux en quelques clics avec une interface facile à utiliser.'
    },
    '/pt-PT/': {
      lang: 'pt-PT',
    },
    '/ru/': {
      lang: 'ru',
      description: 'Создавайте локальный веб-сервер в несколько кликов с помощью простого интерфейса.'
    },
    '/de/': {
      lang: 'de',
      description: 'Erstelle lokale Webserver mit wenigen Klicks und einem einfachen Interface.'
    },
    '/ja/': {
      lang: 'ja',
      description: '簡単UIでほんの数クリックだけでローカルウェブサーバーを作れます。'
    },
    '/ko/': {
      lang: 'ko',
      description: '사용하기 쉬운 인터페이스로 몇 번의 클릭만으로 로컬 웹 서버를 만들어 보세요.'
    },
    '/it-IT/': {
      lang: 'it-IT',
      description: 'Crea server web locali in pochi clic con un\'interfaccia facile da usare.'
    },
    '/uk/': {
      lang: 'uk',
    },
    '/az/': {
      lang: 'az',
      description: 'Sadə bir istifadəçi interfeysi ilə cəmi bir neçə kliklə lokal veb serverlər yaradın.'
    },
    '/nl/': {
      lang: 'nl',
      description: 'Maak lokale web-servers in een paar klikken met een gebruiksvriendelijke interface.'
    },
    '/sv/': {
      lang: 'sv',
      description: 'Skapa lokala webservrar med några få klick i ett lättanvänt användargränssnitt.'
    },
  },
  theme: defaultTheme({
    selectLanguageName: 'English',
    selectText: 'Language',
    navbar: [
      {
        text: 'Download',
        link: '/download.html',
      },
      {
        text: 'Documentation',
        link: '/docs/options.html'
      }
    ],
    sidebar: {
      '/docs/': [
        {
          title: 'Configuration',
          collapsable: false,
          children: [
            {
              text: "Server Options",
              link: "/docs/options.html"
            },
            {
              text: "App Settings",
              link: "/docs/settings.html"
            }
          ]
        },
        {
          title: 'Guides',
          collapsable: false,
          children: [
            {
              text: "Editing config.json",
              link: "/docs/config file.html"
            },
            {
              text: "Using HTTPS",
              link: "/docs/https.html"
            },
            {
              text: "Viewing logs",
              link: "/docs/logs.html"
            },
            {
              text: "Building from source",
              link: "/docs/build.html"
            },
            {
              text: "Coming from Web Server for Chrome?",
              link: "/docs/wsc.html"
            }
          ]
        },
        {
          title: 'Plugins',
          collapsable: false,
          children: [
            {
              text: "Introduction to plugins",
              link: "/docs/plugins.html"
            },
            {
              text: "Plugin manifest file",
              link: "/docs/plugin manifest file.html"
            },
            {
              text: "Plugin script",
              link: "/docs/plugin script.html"
            }
          ]
        },
        {
          title: 'Advanced Guides',
          collapsable: false,
          children: [
            {
              text: "Advanced configuration using .swshtaccess files",
              link: "/docs/swsaccess.html"
            },
            {
              text: "Using custom scripts",
              link: "/docs/custom scripts.html"
            },
            {
              text: "Creating a custom request handler",
              link: "/docs/custom request handler.html"
            }
          ]
        }
      ]
    },
    locales: {
      '/zh-CN/': {
        selectLanguageName: '简体中文',
        selectText: '语言',
        navbar: [
          {
            text: '下载',
            link: '/zh-CN/download.html',
          },
          {
            text: '文档',
            link: '/zh-CN/docs/options.html'
          }
        ],
        sidebar: {
          '/zh-CN/docs/': [
            {
              title: '配置',
              collapsable: false,
              children: [
                {
                  text: "服务器配置",
                  link: "/zh-CN/docs/options.html"
                },
                {
                  text: "应用设置",
                  link: "/zh-CN/docs/settings.html"
                }
              ]
            },
            {
              title: '指南',
              collapsable: false,
              children: [
                {
                  text: "编辑 config.json",
                  link: "/zh-CN/docs/config file.html"
                },
                {
                  text: "使用 HTTPS",
                  link: "/zh-CN/docs/https.html"
                },
                {
                  text: "查看日志",
                  link: "/zh-CN/docs/logs.html"
                },
                {
                  text: "从源码构建",
                  link: "/zh-CN/docs/build.html"
                },
                {
                  text: "来自Chrome的Web Server?",
                  link: "/zh-CN/docs/wsc.html"
                }
              ]
            },
            {
              title: '插件',
              collapsable: false,
              children: [
                {
                  text: "插件介绍",
                  link: "/zh-CN/docs/plugins.html"
                },
                {
                  text: "插件清单文件",
                  link: "/zh-CN/docs/plugin manifest file.html"
                },
                {
                  text: "插件脚本",
                  link: "/zh-CN/docs/plugin script.html"
                }
              ]
            },
            {
              title: '高级指南',
              collapsable: false,
              children: [
                {
                  text: "使用.swshtaccess文件进行高级配置",
                  link: "/zh-CN/docs/swsaccess.html"
                },
                {
                  text: "使用自定义脚本",
                  link: "/zh-CN/docs/custom scripts.html"
                },
                {
                  text: "创建自定义httpRequest程序",
                  link: "/zh-CN/docs/custom request handler.html"
                }
              ]
            }
          ]
        }
      },
      '/zh-TW/': {
        selectLanguageName: '繁體中文',
        selectText: '語言'
      },
      '/es/': {
        selectLanguageName: 'Español',
        selectText: 'Idioma',
        navbar: [
          {
            text: 'Descargar',
            link: '/download.html',
          },
          {
            text: 'Documentación',
            link: '/docs/options.html'
          }
        ]
      },
      '/fr-FR/': {
        selectLanguageName: 'Français',
        selectText: 'Langue'
      },
      '/pt-PT/': {
        selectLanguageName: 'Português',
        selectText: 'Idioma'
      },
      '/ru/': {
        selectLanguageName: 'Русский',
        selectText: 'Язык',
        navbar: [
          {
            text: 'Скачать',
            link: '/download.html',
          },
          {
            text: 'Документация',
            link: '/docs/options.html'
          }
        ]
      },
      '/de/': {
        selectLanguageName: 'Deutsch',
        selectText: 'Taal'
      },
      '/ja/': {
        selectLanguageName: '日本',
        selectText: '言語'
      },
      '/ko/': {
        selectLanguageName: '한국어',
        selectText: '언어'
      },
      '/it-IT/': {
        selectLanguageName: 'Italiano',
        selectText: 'Lingua'
      },
      '/uk/': {
        selectLanguageName: 'Українська',
        selectText: 'Мова'
      },
      '/az/': {
        selectLanguageName: 'Azərbaycanca',
        selectText: 'Dil',
        navbar: [
          {
            text: 'Yüklə',
            link: '/download.html',
          },
          {
            text: 'Dokumentasiya',
            link: '/docs/options.html'
          }
        ]
      },
      '/nl/': {
        selectLanguageName: 'Nederlands',
        selectText: 'Taal'
      },
      '/sv/': {
        selectLanguageName: 'Svenska',
        selectText: 'Språk'
      },
    },
    logo: '/favicon.ico',
    accentColor: '#d09608',
    repo: 'https://github.com/terreng/simple-web-server',
    repoLabel: 'GitHub',
    editLink: true,
    smoothScroll: true,
    contributors: false,
    docsDir: 'website/src',
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: false,
  }),
  plugins: [
    searchPlugin({
      maxSuggestions: 10,
      isSearchable: (page) => page.path !== '/',
      getExtraFields: (page) => page.frontmatter.tags ?? [],
      locales: {
        '/': {
          placeholder: 'Search...',
        },
        '/es/': {
          placeholder: 'Busca...',
        },
        '/az/': {
          placeholder: 'Axtar...',
        }
      }
    })
  ],
  bundler: viteBundler({
    viteOptions: {},
    vuePluginOptions: {},
  })
})