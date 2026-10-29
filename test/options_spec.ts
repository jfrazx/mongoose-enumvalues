import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import enumValues from '../src/index';

const { Schema } = mongoose;

// No database writes: these only build schemas and read what the plugin did.
const kindSchema = () =>
  new Schema({ kind: { type: String, enum: ['a', 'b'] } });

describe('EnumValues', function () {
  describe('only', function () {
    it('a throwing predicate surfaces its own error', function () {
      expect(function () {
        kindSchema().plugin(enumValues, {
          only: [
            () => {
              throw new Error('boom');
            },
          ],
        });
      }).to.throw('boom');
    });

    it('a value that is not a filter is still rejected', function () {
      expect(function () {
        kindSchema().plugin(enumValues, { only: [42 as never] });
      }).to.throw(
        'number is not an allowed filter type. Must be String, RegExp or Function',
      );
    });

    it('null is rejected with the same message as in 0.0.3', function () {
      expect(function () {
        kindSchema().plugin(enumValues, { only: [null as never] });
      }).to.throw(
        'object is not an allowed filter type. Must be String, RegExp or Function',
      );
    });

    it('a RegExp filter selects paths', function () {
      const schema = kindSchema();

      schema.plugin(enumValues, {
        only: [/^ki/],
        virtual: { properties: { kind: 'kinds' } },
      });

      expect(schema.virtuals).to.have.property('kinds');
    });

    it('a function filter selects paths', function () {
      const schema = kindSchema();

      schema.plugin(enumValues, {
        only: [(p: string) => p === 'kind'],
        virtual: { properties: { kind: 'kinds' } },
      });

      expect(schema.virtuals).to.have.property('kinds');
    });

    it('a RegExp filter that matches nothing selects nothing', function () {
      const schema = kindSchema();

      schema.plugin(enumValues, {
        only: [/^zz/],
        virtual: { properties: { kind: 'kinds' } },
      });

      expect(schema.virtuals).to.not.have.property('kinds');
    });

    it('a function filter returning false selects nothing', function () {
      const schema = kindSchema();

      schema.plugin(enumValues, {
        only: [() => false],
        virtual: { properties: { kind: 'kinds' } },
      });

      expect(schema.virtuals).to.not.have.property('kinds');
    });

    it('undefined is rejected as a filter', function () {
      expect(function () {
        kindSchema().plugin(enumValues, { only: [undefined as never] });
      }).to.throw(
        'undefined is not an allowed filter type. Must be String, RegExp or Function',
      );
    });
  });
});
