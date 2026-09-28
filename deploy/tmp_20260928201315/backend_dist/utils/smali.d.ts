export interface PatchOptions {
    serverUrl?: string;
    homeUrl?: string;
    bootstrapToken?: string;
    packageName?: string;
    defaultServer?: string;
    defaultHome?: string;
}
export declare function patchSmaliContent(content: string, opts: PatchOptions): {
    content: string;
    counts: {
        serverPatched: number;
        homePatched: number;
        tokenPatched: number;
        packagePatched: number;
    };
    modified: boolean;
};
//# sourceMappingURL=smali.d.ts.map