
const chimera_directives = {
    blade: {
        if: (condition) => `<fragment if="${condition}" >`,
        elseif: (condition) => `</fragment><fragment elseif="${condition}" >`,
        else: () => `</fragment><fragment else="" >`,
        for: (operation) => `<fragment repeat="${operation}" >`,
        endif: () => `</fragment>`,
        endfor: () => `</fragment>`,
    },
    native: [
        '^if$',
        '^repeat$',
        '^else$',
        '^elseif$',
        '^props\.',
        '^events\.',
        '^directives\.',
    ],
    angular: {
        '*for': (operation) => ` repeat="${operation}" `,
        '*if': (condition) => ` if="${condition}" `,
        '*elseif': (condition) => ` elseif="${condition}" `,
        '*else': () => ` else="" `,
    },
    vueJs:  {
        'on': (name, callback) => `events.${name}="${callback}"`,
        'attach': (name, template) => `directives.${name}="${template}"`,
        'props': (name, template) => `props.${name}="${template}"`,
    }
};

/**
 *
 * @param {?string} value
 * @returns {string}
 */
const htmlAttributeClean = (value) => {
    if(!value) {
        return null;
    }
    return value.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;').split("'").join('&#39;');
};


/**
 *
 * @param  {string|object} viewSource
 * @returns {object|string}
 */
export default function chimeraEngine(viewSource) {
    if(!(typeof viewSource === 'string')) {
        return viewSource;
    }
    let viewTranslated = viewSource;

    for(const key in chimera_directives.blade) {
        viewTranslated = viewTranslated.replace((new RegExp(`@${key}(\\((.*?)\\))?`, 'g')), (match, captured, operation) => {
            operation = htmlAttributeClean(operation);
            return chimera_directives.blade[key](operation);
        });
    }

    viewTranslated = viewTranslated.replace(/<(.*?)>/g, (match, captured) => {
        if(captured.startsWith('/')) {
            return match;
        }
        captured = captured.replace(/\*else/i, 'else=""');
        captured = captured.replace(/([a-z0-9*.:-_$]+)\s*=\s*\{(.*?)}/gi, (match, attrName, template) => {
            template = htmlAttributeClean(template);
            if(chimera_directives.angular[attrName]) {
                return chimera_directives.angular[attrName](template);
            }
            const attrAsVueParts = attrName.split(':');
            if(attrAsVueParts.length > 1) {
                const [type, name] = attrAsVueParts;
                if(chimera_directives.vueJs[type]) {
                    return chimera_directives.vueJs[type](name, template);
                }
            }
            for(const index in chimera_directives.native) {
                if((new RegExp(chimera_directives.native[index])).test(attrName)) {
                    return `${attrName}="${template}"`;
                }
            }
            return `${attrName}="{{ ${template} }}"`;
        });
        return `<${captured}>`;
    });

    return viewTranslated;
}