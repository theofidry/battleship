import { Console } from 'console';
import { Transform } from 'stream';

const transformer = new Transform({
    transform: (chunk, _, cb) => cb(null, chunk),
});

const stringConsole = new Console({
    stdout: transformer,
    stderr: transformer,
    colorMode: false,
});

const handler: ProxyHandler<Console> = {
    get(_: any, propertyName: any) {
        return new Proxy((stringConsole as any)[propertyName], handler);
    },

    apply(target, _, args) {
        (target as any).apply(stringConsole, args);

        return (transformer.read() || '').toString();
    },
};

const consoleProxy = new Proxy(stringConsole, handler);

export default consoleProxy;
