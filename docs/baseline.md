# Phase 0 baseline

Measured on the unmodified 2017 source (`index.js` untouched) against
Mongoose 8.24.4 and Vitest 4.1.11, on 2026-09-11, Node v24.14.1, arm64 macOS.

This is the reference #14 and #15 are measured against:

- #14 changes packaging only — these results must not move.
- #15 makes the red green, or justifies it in writing.

## Result

`npm test` runs to completion for the first time since 2017.
**12 passed, 1 failed, 13 total.** Stable across three consecutive runs.

> **Amended in #13 (Phase 1).** This result is unchanged under **Vitest 5.0.0**
> — same count, same test, same assertion, stable across three further runs —
> and unchanged again after Prettier reformatted the tree. Coverage also holds
> at **94.87% statements** on `index.js`.
>
> The one red is now **pinned**: `test/modify_spec.js` catches the expected
> `AssertionError` and asserts on its exact message, so `npm test` reports
> **13 passed** and exits `0` while the behaviour stays broken and measured.
>
> This deviates from **D11**, which locked `it.fails()`. That marker passes on
> _any_ thrown error — an injected `TypeError` still reported "1 expected fail"
> and exited `0`, and the four assertions after the failing one never ran at
> all. Pinning the specific error keeps both properties D11 wanted. Verified
> both directions: an unrelated regression inside that test now fails the
> suite, and making the assertion pass also fails it, with
> `baseline red is fixed -- see #15`. That is the signal #15 should expect when
> it fixes the behaviour. The pin is removed as part of that fix.

> **Amended in #14 (Phase 2).** The source moved to `src/index.ts`, ported to
> TypeScript with its behaviour unchanged, and the specs and fixtures moved to
> TypeScript with it. The result holds: **13 passed**, exit `0`. The pin now
> sits in `test/modify_spec.ts:92`, at lines 107-114, and still trips with
> `baseline red is fixed -- see #15` — verified by making `determineValue`
> return `null` there, as the fix would.
>
> Coverage reads **93.96% statements** on `src/index.ts`. The uncovered code
> is unchanged: the three `catch` blocks that call `next(error)`, the function
> and `RegExp` filter branches, and `filterPaths`' rethrow. Only the count
> moved, because statements are now mapped through TypeScript source maps.

## Per-test

| #   | File         | Test                                                 | Result   | Cause if red                                                              |
| --- | ------------ | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| 1   | virtual_spec | should create virtual property "speciesOptions"      | pass     |                                                                           |
| 2   | virtual_spec | should NOT create virtual property "numberOfLegs"    | pass     |                                                                           |
| 3   | virtual_spec | should be an array of values                         | pass     |                                                                           |
| 4   | attach_spec  | findeOne should attach enumValues as object property | pass     |                                                                           |
| 5   | attach_spec  | find should attach enumValues to all objects         | pass     |                                                                           |
| 6   | attach_spec  | genders should include ["MALE", "FEMALE"]            | pass     |                                                                           |
| 7   | modify_spec  | should NOT modify the property                       | pass     |                                                                           |
| 8   | modify_spec  | should modify property when `lean()` is used         | pass     |                                                                           |
| 9   | modify_spec  | should reset value on update                         | pass     |                                                                           |
| 10  | modify_spec  | should update other values normally                  | pass     |                                                                           |
| 11  | modify_spec  | should update enum                                   | pass     |                                                                           |
| 12  | modify_spec  | should process nested enums                          | **FAIL** | Unset nested paths are no longer materialized in lean results — see below |
| 13  | modify_spec  | should find by id and modify                         | pass     |                                                                           |

The failure is independent, not a cascade: it is the first assertion in its
test, and the tests before it all pass.

Row 12 still reads **FAIL** because that is what Phase 0 measured. Since #13 the
failure is pinned rather than left loose, so `npm test` reports 13 passed. The
behaviour is unchanged — only how it is recorded.

## The one failure, in detail

```
AssertionError: expected undefined to be null
 ❯ test/modify_spec.js:68
     expect(role.nesting.something.value).to.be.null;
```

**Cause — a Mongoose 4 → 8 behavior change, not the one the roadmap predicted.**

The `Role` fixture is created with only `role: 'moderator'`, so `nesting.something`
is never assigned. Confirmed against the raw driver, bypassing all plugin hooks:

```
RAW in mongo          : {"_id":"...","role":"moderator","priority":2,"__v":0}
lean BEFORE any update: {"something":{"values":["wicked","this","way","comes"]}}
```

Mongoose 4 materialized unset nested paths in `lean()` results, so the plugin
received `{ something: null }`. `determineValue` (`index.js:267-280`) hit
`null.value`, threw, and its `catch` returned `null` — which is what the test
asserts.

Mongoose 8 omits the unset path entirely. `determineValue` now receives
`undefined`, throws on `undefined['something']`, and its `catch` returns
`undefined`. The assertion wants `null`.

So the plugin's behavior is unchanged; what changed is what Mongoose hands it.
The `catch`-and-return-input idiom in `determineValue` silently converts a
structural difference into a value difference.

A side effect worth noting for #15: replaying test 9's `$set` writes an empty
`nesting: {}` object into the document, because `nest()` wraps an `undefined`
value. Harmless here, but it means the plugin writes a key that was never set.

**This was not the predicted failure.** The roadmap expected `modify`'s update
paths to go red because `pre('update')` (`index.js:155`) hooks a method Mongoose 7
removed. That hook is indeed dead — it registers without error and never fires —
but no test depends on it: tests 9, 11 and 12 route through `findOneAndUpdate`,
whose hook is still live, and test 10 uses `$inc`, which `reformatUpdateProperty`
skips anyway because it only reads `this._update['$set']` (`index.js:103`).

## Changes made to the tests during the port

| Change                                             | Reason                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| `done()` → `async`/`await`, all 13 tests           | Vitest rejects `done()`: "done() callback is deprecated, use promise instead" |
| `before` → `beforeAll`                             | Vitest naming                                                                 |
| `chai` require lines removed                       | Vitest bundles chai; every assertion is unchanged                             |
| `role.update()` → `role.updateOne()` (modify_spec) | `Document.prototype.update()` removed in Mongoose 7                           |

No assertion was changed, added, or removed. `index.js` and `test/models/*.js`
are byte-identical to the 2017 source.

> **No longer true as of #13 (Phase 1).** Prettier reformatted the whole tree,
> including `index.js` and `test/models/*.js`. The change is whitespace only —
> `git diff -w --ignore-blank-lines` over `index.js` shows nothing but expanded
> single-line blocks, wrapped argument lists, and removed redundant parentheses
> — and the suite result above is unchanged across it. The _behaviour_ baseline
> this document records still stands; only the byte-level claim does not.

> **And as of #14 (Phase 2),** the specs and fixtures are TypeScript. The
> changes are module syntax — `import` in place of `require()`, Vitest's
> functions imported rather than global, and the fixtures loading the plugin
> from `src/index.ts` rather than by a working-directory path — plus type
> annotations, which compile away. Still no assertion was changed, added, or
> removed.

## Observations carried into #15

> **Line numbers below cite `index.js` as Phase 0 measured it, and no longer
> resolve.** #13's Prettier reformat moved every anchor, and #14 moved the file
> to `src/index.ts`. The code is unchanged — only its formatting, and in #14
> its types. Current locations, in `src/index.ts`:
>
> | Observation                             | Cited as  | Now at                                                      |
> | --------------------------------------- | --------- | ----------------------------------------------------------- |
> | `pre('update')` registration            | `155`     | `252-253`, inside the `['update', 'findOneAndUpdate']` loop |
> | `this._mongooseOptions.lean`            | `78`      | `154`                                                       |
> | inner `paths.forEach` shadowing `path`  | `249`     | `357`                                                       |
> | `filterPaths` rethrowing everything     | `187-215` | from `285`                                                  |
> | `determineValue` swallowing all errors  | `267-280` | from `375`                                                  |
> | `nest()` mutating via `array.reverse()` | `289`     | `402`                                                       |
> | `next()`-style pre hooks                | `102-141` | from `182`                                                  |
>
> Coverage's uncovered-line list moved with them: `89,116,137,199,205-208` in
> Phase 0 is `168,202,225,303-304,309,312-314` now.

Found while measuring. None are test failures; all are latent.

- **`index.js:155`** registers `pre('update')`. Mongoose 7 removed that method.
  Verified: the hook registers without throwing on Mongoose 8 and never fires.
  Dead code, not a live failure.
- **`index.js:78`** reads the private `this._mongooseOptions.lean`. The correct
  public replacement is **`this.mongooseOptions().lean`** — verified to return
  `true` after `.lean()`. Note that `this.getOptions().lean` returns `undefined`
  and would silently disable the entire modify read path. The roadmap's
  prescribed substitution is wrong; do not apply it.
- **`index.js:249`** — the inner `paths.forEach(function(path))` shadows the
  outer `path`, so every attached property receives the _last_ path's
  `enumValues`. Both fixtures define exactly one attach property, so the bug is
  invisible to this suite. It needs a test in #15, not just a fix.
- **`index.js:267-280`** — `determineValue` catches every error and returns its
  input. That is what turned a Mongoose structural change into test 12's
  `undefined`/`null` mismatch, and it will mask future ones.
- **`index.js:289`** — `nest()` calls `array.reverse()`, mutating its argument
  in place.
- **`index.js:187-215`** — `filterPaths` rethrows every error as "not an allowed
  filter type", including errors that have nothing to do with filter types.
- **`index.js:102-141`** use `next()`-style pre hooks. Valid on Mongoose 8;
  Mongoose 9 removed `next()` support in `pre()`. This suite does not yet run
  against 9 — that leg arrives in #13.

> **Added in #14 (Phase 2).** Two more, found in review of the port. Both
> reproduce identically against the 2017 `index.js` and the built
> `dist/index.cjs` on Mongoose 8.24.4, so they predate the port, and this
> suite covers neither. Cited by their `src/index.ts` lines.
>
> - **`src/index.ts:355-358`** — `attach`'s post hook does not check for
>   `null`. A `findOne` that matches nothing passes it `null`, `asArray()`
>   wraps that as `[null]`, and the assignment throws. The query rejects with
>   `TypeError: Cannot set properties of null` instead of resolving `null`.
>   `attach` registers on `findOne` by default, so no opt-in is needed to hit
>   this.
> - **`src/index.ts:168`, `202` and `225`** — `return next(error)` inside a
>   `forEach` callback returns from the callback only. The loop carries on, and
>   the hook then calls `next()` a second time. On Mongoose 8.24.4 the first
>   call wins and the second is dropped without a trace, but nothing promises
>   that. One case reaches this today: a `.lean()` `findOne` that matches
>   nothing, with `modify` on, rejects with
>   `TypeError: Cannot read properties of null`. That is the same missing
>   `null` check as above. These are the three `catch` lines in the uncovered
>   list.

## Resolved in #15 (Phase 3)

The middleware rewrite closes every observation above, the two bugs added in
#14, two more found while rewriting, and three found in review. The
measurements earlier in this document are left as they were: they record what
each phase saw. This section records what changed, and the test that fails if
it regresses. Tests are named by spec file, then `describe`, then `it`.

| Observation                                                   | Resolution                                                                                                                                                                                                                                                                                                                              | Pinned by                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pre('update')` registration (`index.js:155`)                 | Removed with every other pre hook (D33). It never fired on Mongoose 7 and later. Updates now unwrap through a setter, which runs as Mongoose casts the update.                                                                                                                                                                          | No test can fail on a hook that never ran. The write it was meant for: `modify_write_spec.ts` › `modify writes` › `findByIdAndUpdate unwraps top-level fields`                                                                                                                                 |
| `this._mongooseOptions.lean` (`index.js:78`)                  | Read with `this.mongooseOptions().lean` (D9). On 8.24.4, in a post hook, `getOptions().lean` is `undefined` for `find` but truthy for `findOne`, so the note above holds for `find` only.                                                                                                                                               | `modify_read_spec.ts` › `modify reads` › `find().lean() handles complete and sparse documents together`, the one test that fails if the accessor regresses; `a non-lean read leaves a sparse document unmodified`, which fails if the flag is not checked at all                               |
| inner `paths.forEach` shadowing `path` (`index.js:249`)       | Each hook attaches only the property of its own path. Also gone: a `findOne`-only property appearing on `find` results, and a throw from an `attach.only` path that has no property.                                                                                                                                                    | `attach_spec.ts` › `attach regressions` › `each attached property appears only on its own hooks`; `attach.only naming a path without a property does not throw`                                                                                                                                |
| `determineValue` swallowing all errors (`index.js:267-280`)   | Deleted. Absent and `null` are handled explicitly (D28, below), and nothing is caught.                                                                                                                                                                                                                                                  | `modify_read_spec.ts` › `modify reads` › `an unset nested enum reads as null`; `a stored null parent reads each nested enum as null`                                                                                                                                                           |
| `nest()` mutating via `array.reverse()` (`index.js:289`)      | Deleted with `determineValue`. Every call passed an array split fresh for that call, so the mutation was never observable.                                                                                                                                                                                                              | None: nothing observable to fail on. The code that replaced it is covered by the nested-siblings row below.                                                                                                                                                                                    |
| `filterPaths` rethrowing everything (`index.js:187-215`)      | Dispatches on the kind of filter. Only a filter of the wrong kind is rejected, with 0.0.3's message (`null` included). A user predicate's own error propagates as it is.                                                                                                                                                                | `options_spec.ts` › `only` › `a throwing predicate surfaces its own error`; `a value that is not a filter is still rejected`; `null is rejected with the same message as in 0.0.3`; `undefined is rejected as a filter`                                                                        |
| `next()`-style pre hooks (`index.js:102-141`)                 | None left: no pre hooks and no `next` in `src/`, and post hooks are synchronous. The Mongoose 9 legs of the `test` job no longer run under `continue-on-error`.                                                                                                                                                                         | No single test. The whole suite passes on Mongoose 9, and the 9 legs gate in CI.                                                                                                                                                                                                               |
| `attach` post hook missing a `null` check (added in #14)      | `asArray(null)` is an empty array, so a `findOne` that matches nothing resolves `null`.                                                                                                                                                                                                                                                 | `attach_spec.ts` › `attach regressions` › `findOne matching nothing resolves null`                                                                                                                                                                                                             |
| `return next(error)` inside `forEach` (added in #14)          | No `next` remains. The case it reached, a `.lean()` `findOne` that matches nothing with `modify` on, resolves `null` instead of rejecting.                                                                                                                                                                                              | `modify_read_spec.ts` › `modify reads` › `findOne matching nothing resolves null`                                                                                                                                                                                                              |
| Nested siblings destroyed (found in #15)                      | Reads write each enum at its own leaf, in place, and touch nothing else (D34). The old code rebuilt the whole top-level object per path, so the second enum under a parent replaced the first and dropped the plain siblings. Writes use the setter, not a rebuilt `$set` that lost siblings such as `label` (D33).                     | `modify_read_spec.ts` › `modify reads` › `lean read transforms every nested enum and keeps siblings`; `a lean document round-trips through $set without losing siblings`. `modify_write_spec.ts` › `modify writes` › `$set of nested shapes keeps siblings`; `updateOne unwraps a dotted path` |
| `create` with a shape stores `{}` (found in #15)              | The setter unwraps the shape on assignment, before the cast that discarded it. A shape assigned to a hydrated document and then saved was dropped the same way, and is now stored.                                                                                                                                                      | `modify_write_spec.ts` › `modify writes` › `create unwraps shapes, applies schema setters, and keeps siblings`; `save unwraps a shape assigned to a hydrated document`                                                                                                                         |
| Shared `enumValues` array (found in review of #15)            | `modify`, `attach` and `virtual` each hand out a copy. They handed out the schema's own array, which Mongoose's enum validator also reads, so pushing onto a read result let that value pass validation everywhere. This predates the rewrite.                                                                                          | `modify_read_spec.ts` › `modify reads` › `mutating a lean result does not change the enum`; `attach_spec.ts` › `attach regressions` › `mutating an attached property does not change the enum`; `virtual_spec.ts` › `virtual` › `mutating the virtual does not change the enum`                |
| A hook result that is not a document (found in review of #15) | Only objects are treated as documents, and an `includeResultMetadata` wrapper is looked through to its `value`. A count named in `on` threw on assignment to a number, and the wrapper got the shape or property in place of its document.                                                                                              | `modify_read_spec.ts` › `modify hook results` › `a lean count resolves the count`; `includeResultMetadata transforms the document, not the wrapper`. `attach_spec.ts` › `attach regressions` › `a count resolves the count`; `includeResultMetadata attaches to the document, not the wrapper` |
| A non-query hook in `modify.on` (found in review of #15)      | `modify` skips a hook whose `this` has no `mongooseOptions()`, since only a query can be lean. A `save` or `aggregate` named in `on` threw a `TypeError`, as it did in 0.0.3.                                                                                                                                                           | `modify_read_spec.ts` › `modify hook results` › `a document hook in modify.on leaves save alone`; `an aggregate hook in modify.on leaves aggregate alone`                                                                                                                                      |
| A non-object parent replaced (found in review of #15)         | A nested enum's parent is given `{}` only when it is missing or `null`. Any other non-object parent is left as stored. Replacing it, as D34 first specified, meant a legacy `settings: ['x']` read lean and written back with `$set` was stored as `{ theme: null, density: null }`; without the plugin, the same `$set` keeps `['x']`. | `modify_read_spec.ts` › `modify reads` › `a non-object parent is left alone`; `an array parent is left alone`; `an array parent round-trips through $set unchanged`                                                                                                                            |

### Test 12 asserts `null` again

_Should process nested enums_ (row 12 of the per-test table) asserts
`expect(role.nesting.something.value).to.be.null` once more. Phase 0 found it
red because Mongoose 8 leaves an unset nested path out of a lean result, where
Mongoose 4 materialized it and 0.0.3 returned `null` (see _The one failure, in
detail_). Decision D28 restores that result. On a `modify` lean read, a
**dotted** path whose value is absent or `null` gives `value: null`. The rule
stops there: a **top-level** path gives what is stored, so absent stays
`undefined` and `null` stays `null`. #13 pinned the failure with an exact-message
catch, and #15 removes that pin.

All in `modify_read_spec.ts` › `modify reads`:

- D28, nested: `an unset nested enum reads as null`, and
  `a stored null nested leaf reads as null`.
- D28, top-level: `an absent top-level enum reads as undefined`, and
  `a stored null top-level enum stays null`.
- D34, as amended in review: only a missing or `null` parent is given `{}`,
  which the nested `null` above needs. Any other non-object parent, such as
  a string or an array, is stored data and is left alone, with no shape
  written under it: `a non-object parent is left alone`,
  `an array parent is left alone`, and
  `an array parent round-trips through $set unchanged`.

### Pre hooks are gone

The `pre('update')` hook and every other pre hook were removed (D33).
`modify`'s write side is now a schema setter on each enum path. The suite
tests it through `create`, `save` after a plain assignment, `insertMany`,
`findOneAndUpdate`/`findByIdAndUpdate`, `updateOne`, `updateMany`,
`replaceOne` and `findOneAndReplace`, with updates given as top-level fields,
a dotted path and `$set`. `validateBeforeSave` only chose which hook
`modify` registered on, so it is now a deprecated no-op: still accepted, and
ignored. A schema with `validateBeforeSave: false` still unwraps on save
(`modify_write_spec.ts` › `modify writes` ›
`validateBeforeSave: false still unwraps on save`).

### Full matrix result

Verified locally, on Node v24.14.1 against MongoDB 8.2.6 (D27): **61 passed**,
in 6 files, on Mongoose **8.24.4** (the lockfile) and on Mongoose **9.11.4**
(`npm install --no-save mongoose@9`). `npm run typecheck` passes on both.

Coverage on `src/index.ts` is 100% statements, 93.9% branches (77 of 82), 100%
functions and 100% lines. The gate in `vitest.config.mjs` (D31) is set at 100,
93, 100 and 100. It was first set from a measurement of 93.82% branches (76 of
81). Folding three object checks into one helper has since removed four
covered branches, leaving the same five uncovered, and 93.5 still rounded down
to 93. The fixes from review added five branches, all covered.

The Node [22, 24] × Mongoose [8, 9] matrix has not run on this branch yet. It
runs in CI on the pull request, and that run is the result of record.
