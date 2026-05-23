import { describe, it, expect } from 'vitest';
import { compile } from './helpers';

describe('dot-path property override', () => {
    it('overrides a nested property via dot notation', () => {
        const result = compile(`
Parent {
    inner.x: 99
}`, {
            'Parent.exon': `{
    inner: {
        x: 1
        y: 2
    }
}`
        });
        expect(result.inner.x).toBe(99);
        expect(result.inner.y).toBe(2);
    });

    it('preserves other properties of the nested object', () => {
        const result = compile(`
Config {
    server.port: 9090
}`, {
            'Config.exon': `{
    server: {
        host: "localhost"
        port: 8080
        debug: false
    }
}`
        });
        expect(result.server.port).toBe(9090);
        expect(result.server.host).toBe('localhost');
        expect(result.server.debug).toBe(false);
    });

    it('supports multiple dot-path overrides in the same object', () => {
        const result = compile(`
Base {
    db.host: "prod.example.com"
    db.port: 5432
}`, {
            'Base.exon': `{
    db: {
        host: "localhost"
        port: 3306
        name: "dev"
    }
}`
        });
        expect(result.db.host).toBe('prod.example.com');
        expect(result.db.port).toBe(5432);
        expect(result.db.name).toBe('dev');
    });

    it('supports three-level deep dot-path override', () => {
        const result = compile(`
Root {
    a.b.c: 42
}`, {
            'Root.exon': `{
    a: {
        b: {
            c: 1
            d: 2
        }
    }
}`
        });
        expect(result.a.b.c).toBe(42);
        expect(result.a.b.d).toBe(2);
    });
});

describe('nested partial object override', () => {
    it('overrides a nested object property while preserving siblings', () => {
        const result = compile(`
Env {
    variables: * {
        name: "new_machine"
    }
}`, {
            'Env.exon': `{
    variables: {
        log: "debug"
        name: "machine01"
    }
}`
        });
        expect(result.variables.name).toBe('new_machine');
        expect(result.variables.log).toBe('debug');
    });

    it('overrides properties at two levels of nesting', () => {
        const result = compile(`
Env {
    version: 12.04
    variables: * {
        name: "new_machine"
    }
}`, {
            'Env.exon': `{
    distro: "ubuntu"
    version: 10.04
    variables: {
        log: "debug"
        name: "machine01"
    }
}`
        });
        expect(result.version).toBe(12.04);
        expect(result.distro).toBe('ubuntu');
        expect(result.variables.name).toBe('new_machine');
        expect(result.variables.log).toBe('debug');
    });

    it('supports doubly-nested partial override', () => {
        const result = compile(`
Base {
    environment: * {
        version: 12.04
        variables: * {
            name: "new_machine"
        }
    }
}`, {
            'Base.exon': `{
    environment: {
        distro: "ubuntu"
        version: 10.04
        variables: {
            log: "debug"
            name: "machine01"
        }
    }
}`
        });
        expect(result.environment.version).toBe(12.04);
        expect(result.environment.distro).toBe('ubuntu');
        expect(result.environment.variables.name).toBe('new_machine');
        expect(result.environment.variables.log).toBe('debug');
    });
});
