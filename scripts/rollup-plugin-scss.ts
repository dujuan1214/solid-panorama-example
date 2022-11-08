import { Plugin, PluginContext } from 'rollup';
import { getAllCacheScss } from 'babel-plugin-panorama-all-in-jsx/css.macro';
import { basename, dirname, join } from 'node:path';
import { writeFile } from 'fs-extra';
import { compileStringAsync } from 'sass';
import { pathToFileURL } from 'node:url';

export function rollupPluginScss(options: {
    inputFiles: string[];
    dir: string;
    resolvePath?: (filename: string) => string | undefined;
}): Plugin {
    function findAndMergeScss(
        ctx: PluginContext,
        id: string,
        cache: Record<string, string>
    ): string {
        const info = ctx.getModuleInfo(id);
        const importedIds = info?.importedIds;
        if (!importedIds) {
            return '';
        }
        let code = '';

        for (const child of importedIds) {
            code += findAndMergeScss(ctx, child, cache) + '\n\n';
        }

        if (cache[id]) {
            code += cache[id];
        }
        return code;
    }

    return {
        name: 'rollup-plugin-scss',
        async writeBundle() {
            const cache = getAllCacheScss();
            for (const file of options.inputFiles) {
                const code = findAndMergeScss(this, file, cache).trim();
                if (!code) {
                    continue;
                }

                const result = await compileStringAsync(code, {
                    url: pathToFileURL(dirname(file))
                });

                let outPath = '';
                if (options.resolvePath) {
                    outPath = options.resolvePath(file) || '';
                }
                if (!outPath) {
                    outPath = join(
                        options.dir,
                        basename(file).replace(/\.tsx?$/, '.css')
                    );
                }
                await writeFile(outPath, result.css);
            }
        }
    };
}
