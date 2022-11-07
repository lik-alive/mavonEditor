import hljsLangs from '../core/hljs/lang.hljs.js'
import {
    loadScript
} from '../core/extra-function.js'
import sanitizer from '../core/sanitizer.js'

var markdown_config = {
    html: true,        // Enable HTML tags in source
    xhtmlOut: true,        // Use '/' to close single tags (<br />).
    breaks: true,        // Convert '\n' in paragraphs into <br>
    langPrefix: 'lang-',  // CSS language prefix for fenced blocks. Can be
    linkify: false,        // 自动识别url
    typographer: true,
    quotes: '“”‘’'
}

var MarkdownIt = require('markdown-it');
// 表情
var emoji = require('markdown-it-emoji');
// 下标
var sub = require('markdown-it-sub')
// 上标
var sup = require('markdown-it-sup')
// <dl/>
var deflist = require('markdown-it-deflist')
// <abbr/>
var abbr = require('markdown-it-abbr')
// footnote
var footnote = require('markdown-it-footnote')
// insert 带有下划线 样式 ++ ++
// var insert = require('markdown-it-ins')
// mark
var mark = require('markdown-it-mark')
// taskLists
var taskLists = require('markdown-it-task-lists')
// container
var container = require('markdown-it-container')
// table of content
var toc = require('markdown-it-toc')

var mihe = require('markdown-it-highlightjs-external');
// math katex
var katex = require('markdown-it-katex-external');
var miip = require('markdown-it-images-preview');
var missLangs = {};
var needLangs = [];
var hljs_opts = {
    hljs: 'auto',
    highlighted: true,
    langCheck: function (lang) {
        if (lang && hljsLangs[lang] && !missLangs[lang]) {
            missLangs[lang] = 1;
            needLangs.push(hljsLangs[lang])
        }
    }
};

export function initMarkdown() {
    const markdown = new MarkdownIt(markdown_config);

    // add target="_blank" to all link
    var defaultRender = markdown.renderer.rules.link_open || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
    };
    markdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        var hIndex = tokens[idx].attrIndex('href');
        if (tokens[idx].attrs[hIndex][1].startsWith('#')) return defaultRender(tokens, idx, options, env, self);
        // If you are sure other plugins can't add `target` - drop check below
        var aIndex = tokens[idx].attrIndex('target');

        if (aIndex < 0) {
            tokens[idx].attrPush(['target', '_blank']); // add new attribute
        } else {
            tokens[idx].attrs[aIndex][1] = '_blank';    // replace value of existing attr
        }

        // pass token to default renderer.
        return defaultRender(tokens, idx, options, env, self);
    };

    return markdown;
}

export default {
    data() {
        return {
            markdownIt: null
        }
    },
    created() {
        this.markdownIt = initMarkdown();

        // Enable extensions
        if (this.extensions.highlight) this.markdownIt.use(mihe, hljs_opts);
        if (this.extensions.subsup) {
            this.markdownIt.use(sub);
            this.markdownIt.use(sup);
        }
        if (this.extensions.container) {
            this.markdownIt.use(container);
            this.markdownIt.use(container, 'hljs-left');
            this.markdownIt.use(container, 'hljs-center');
            this.markdownIt.use(container, 'hljs-right');
        }
        // if (this.extensions.insert) this.markdownIt.use(insert);
        if (this.extensions.deflist) this.markdownIt.use(deflist);
        if (this.extensions.abbr) this.markdownIt.use(abbr);
        if (this.extensions.mark) this.markdownIt.use(mark);
        if (this.extensions.footnote) this.markdownIt.use(footnote);
        if (this.extensions.taskLists) this.markdownIt.use(taskLists);
        if (this.extensions.emoji) this.markdownIt.use(emoji);
        if (this.extensions.katex) this.markdownIt.use(katex);
        if (this.extensions.miip) this.markdownIt.use(miip);
        if (this.extensions.toc) this.markdownIt.use(toc);

        if (!this.html) {
            this.markdownIt.set({ html: false });
            this.markdownIt.set({ xssOptions: false });
        } else if (typeof this.xssOptions === 'object') {
            this.markdownIt.use(sanitizer, this.xssOptions);
        }
    },
    mounted() {
        hljs_opts.highlighted = this.ishljs;
    },
    methods: {
        $render(src, func) {
            var $vm = this;
            missLangs = {};
            needLangs = [];
            var res = this.markdownIt.render(src);
            if (this.ishljs) {
                if (needLangs.length > 0) {
                    $vm.$_render(src, func, res);
                }
            }
            func(res);
        },
        $_render(src, func, res) {
            var $vm = this;
            var deal = 0;
            for (var i = 0; i < needLangs.length; i++) {
                var url = $vm.p_external_link.hljs_lang(needLangs[i]);
                loadScript(url, function () {
                    deal = deal + 1;
                    if (deal === needLangs.length) {
                        res = this.markdownIt.render(src);
                        func(res);
                    }
                })
            }
        }
    },
    watch: {
        ishljs: function (val) {
            hljs_opts.highlighted = val;
        }
    }
};
