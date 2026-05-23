declare module 'argv' {
    interface ArgvOption {
        name: string;
        short?: string;
        type?: string;
    }
    interface ArgvResult {
        targets: string[];
        options: Record<string, any>;
    }
    function option(options: ArgvOption[]): typeof import('argv');
    function run(): ArgvResult;
}
