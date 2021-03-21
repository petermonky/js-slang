import { mockContext } from '../../mocks/context'
import { parse } from '../../parser/parser'
import { substituterNodes } from '../../types'
import { codify, getEvaluationSteps } from '../stepper'

function getLastStepAsString(steps: [substituterNodes, string[][], string][]): string {
  return codify(steps[steps.length - 1][0]).trim()
}

// source 0
test('Test basic substitution', () => {
  const code = `
    (1 + 2) * (3 + 4);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"(1 + 2) * (3 + 4);

(1 + 2) * (3 + 4);

3 * (3 + 4);

3 * (3 + 4);

3 * 7;

3 * 7;

21;

21;
"
`)
})

test('Test binary operator error', () => {
  const code = `
    (1 + 2) * ('a' + 'string');
  `
  const context = mockContext()
  const program = parse(code, context)!
  const steps = getEvaluationSteps(program, context, 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"(1 + 2) * ('a' + 'string');

(1 + 2) * ('a' + 'string');

3 * ('a' + 'string');

3 * ('a' + 'string');

3 * \\"astring\\";

3 * \\"astring\\";
"
`)
})

test('Test two statement substitution', () => {
  const code = `
    (1 + 2) * (3 + 4);
    3 * 5;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(4), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"(1 + 2) * (3 + 4);
3 * 5;

(1 + 2) * (3 + 4);
3 * 5;

3 * (3 + 4);
3 * 5;

3 * (3 + 4);
3 * 5;

3 * 7;
3 * 5;

3 * 7;
3 * 5;

21;
3 * 5;

21;
3 * 5;

3 * 5;

3 * 5;

15;

15;
"
`)
})

test('Test unary and binary boolean operations', () => {
  const code = `
  !!!true || true;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"!!!true || true;

!!!true || true;

!!false || true;

!!false || true;

!true || true;

!true || true;

false || true;

false || true;

true;

true;
"
`)
})

test('Test ternary operator', () => {
  const code = `
  1 + -1 === 0
    ? false ? garbage : Infinity
    : anotherGarbage;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"1 + -1 === 0 ? false ? garbage : Infinity : anotherGarbage;

1 + -1 === 0 ? false ? garbage : Infinity : anotherGarbage;

0 === 0 ? false ? garbage : Infinity : anotherGarbage;

0 === 0 ? false ? garbage : Infinity : anotherGarbage;

true ? false ? garbage : Infinity : anotherGarbage;

true ? false ? garbage : Infinity : anotherGarbage;

false ? garbage : Infinity;

false ? garbage : Infinity;

Infinity;

Infinity;
"
`)
})

test('Test basic function', () => {
  const code = `
  function f(n) {
    return n;
  }
  f(5+1*6-40);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"function f(n) {
  return n;
}
f(5 + 1 * 6 - 40);

function f(n) {
  return n;
}
f(5 + 1 * 6 - 40);

f(5 + 1 * 6 - 40);

f(5 + 1 * 6 - 40);

f(5 + 6 - 40);

f(5 + 6 - 40);

f(11 - 40);

f(11 - 40);

f(-29);

f(-29);

-29;

-29;
"
`)
})

test('Test basic bifunction', () => {
  const code = `
  function f(n, m) {
    return n * m;
  }
  f(5+1*6-40, 2-5);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"function f(n, m) {
  return n * m;
}
f(5 + 1 * 6 - 40, 2 - 5);

function f(n, m) {
  return n * m;
}
f(5 + 1 * 6 - 40, 2 - 5);

f(5 + 1 * 6 - 40, 2 - 5);

f(5 + 1 * 6 - 40, 2 - 5);

f(5 + 6 - 40, 2 - 5);

f(5 + 6 - 40, 2 - 5);

f(11 - 40, 2 - 5);

f(11 - 40, 2 - 5);

f(-29, 2 - 5);

f(-29, 2 - 5);

f(-29, -3);

f(-29, -3);

-29 * -3;

-29 * -3;

87;

87;
"
`)
})

test('Test "recursive" function calls', () => {
  const code = `
  function factorial(n) {
    return n === 0
      ? 1
      : n * factorial(n-1);
  }
  factorial(5);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"function factorial(n) {
  return n === 0 ? 1 : n * factorial(n - 1);
}
factorial(5);

function factorial(n) {
  return n === 0 ? 1 : n * factorial(n - 1);
}
factorial(5);

factorial(5);

factorial(5);

5 === 0 ? 1 : 5 * factorial(5 - 1);

5 === 0 ? 1 : 5 * factorial(5 - 1);

false ? 1 : 5 * factorial(5 - 1);

false ? 1 : 5 * factorial(5 - 1);

5 * factorial(5 - 1);

5 * factorial(5 - 1);

5 * factorial(4);

5 * factorial(4);

5 * (4 === 0 ? 1 : 4 * factorial(4 - 1));

5 * (4 === 0 ? 1 : 4 * factorial(4 - 1));

5 * (false ? 1 : 4 * factorial(4 - 1));

5 * (false ? 1 : 4 * factorial(4 - 1));

5 * (4 * factorial(4 - 1));

5 * (4 * factorial(4 - 1));

5 * (4 * factorial(3));

5 * (4 * factorial(3));

5 * (4 * (3 === 0 ? 1 : 3 * factorial(3 - 1)));

5 * (4 * (3 === 0 ? 1 : 3 * factorial(3 - 1)));

5 * (4 * (false ? 1 : 3 * factorial(3 - 1)));

5 * (4 * (false ? 1 : 3 * factorial(3 - 1)));

5 * (4 * (3 * factorial(3 - 1)));

5 * (4 * (3 * factorial(3 - 1)));

5 * (4 * (3 * factorial(2)));

5 * (4 * (3 * factorial(2)));

5 * (4 * (3 * (2 === 0 ? 1 : 2 * factorial(2 - 1))));

5 * (4 * (3 * (2 === 0 ? 1 : 2 * factorial(2 - 1))));

5 * (4 * (3 * (false ? 1 : 2 * factorial(2 - 1))));

5 * (4 * (3 * (false ? 1 : 2 * factorial(2 - 1))));

5 * (4 * (3 * (2 * factorial(2 - 1))));

5 * (4 * (3 * (2 * factorial(2 - 1))));

5 * (4 * (3 * (2 * factorial(1))));

5 * (4 * (3 * (2 * factorial(1))));

5 * (4 * (3 * (2 * (1 === 0 ? 1 : 1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (1 === 0 ? 1 : 1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (false ? 1 : 1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (false ? 1 : 1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (1 * factorial(1 - 1)))));

5 * (4 * (3 * (2 * (1 * factorial(0)))));

5 * (4 * (3 * (2 * (1 * factorial(0)))));

5 * (4 * (3 * (2 * (1 * (0 === 0 ? 1 : 0 * factorial(0 - 1))))));

5 * (4 * (3 * (2 * (1 * (0 === 0 ? 1 : 0 * factorial(0 - 1))))));

5 * (4 * (3 * (2 * (1 * (true ? 1 : 0 * factorial(0 - 1))))));

5 * (4 * (3 * (2 * (1 * (true ? 1 : 0 * factorial(0 - 1))))));

5 * (4 * (3 * (2 * (1 * 1))));

5 * (4 * (3 * (2 * (1 * 1))));

5 * (4 * (3 * (2 * 1)));

5 * (4 * (3 * (2 * 1)));

5 * (4 * (3 * 2));

5 * (4 * (3 * 2));

5 * (4 * 6);

5 * (4 * 6);

5 * 24;

5 * 24;

120;

120;
"
`)
})

// source 0
test('undefined || 1', () => {
  const code = `
  undefined || 1;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"undefined || 1;

undefined || 1;
"
`)
})

// source 0
test('1 + math_sin', () => {
  const code = `
  1 + math_sin;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"1 + math_sin;

1 + math_sin;
"
`)
})

// source 0
test('plus undefined', () => {
  const code = `
  math_sin(1) + undefined;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"math_sin(1) + undefined;

math_sin(1) + undefined;

0.8414709848078965 + undefined;

0.8414709848078965 + undefined;
"
`)
})

// source 0
test('math_pow', () => {
  const code = `
  math_pow(2, 20) || NaN;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"math_pow(2, 20) || NaN;

math_pow(2, 20) || NaN;

1048576 || NaN;

1048576 || NaN;
"
`)
})

// source 0
test('expmod', () => {
  const code = `
  function is_even(n) {
    return n % 2 === 0;
}

function expmod(base, exp, m) {
    if (exp === 0) {
        return 1;
    } else {
        if (is_even(exp)) {
            const to_half = expmod(base, exp / 2, m);
            return to_half * to_half % m;
        } else {
            return base * expmod(base, exp - 1, m) % m;
        }
    }
}

expmod(4, 3, 5);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
})

// source 0
test('Infinite recursion', () => {
  const code = `
  function f() {
    return f();
}
f();
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
})

// source 0
test('subsets', () => {
  const code = `
  function subsets(s) {
    if (is_null(s)) {
        return list(null);
    } else {
        const rest = subsets(tail(s));
        return append(rest, map(x => pair(head(s), x), rest));
    }
}

 subsets(list(1, 2, 3));
  `
  const program = parse(code, mockContext(2))!
  const steps = getEvaluationSteps(program, mockContext(2), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
})

// source 0
test('even odd mutual', () => {
  const code = `
  const odd = n => n === 0 ? false : even(n-1);
  const even = n => n === 0 || odd(n-1);
  even(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('false;')
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"const odd = n => n === 0 ? false : even(n - 1);
const even = n => n === 0 || odd(n - 1);
even(1);

const odd = n => n === 0 ? false : even(n - 1);
const even = n => n === 0 || odd(n - 1);
even(1);

const even = n => n === 0 || (n => n === 0 ? false : even(n - 1))(n - 1);
even(1);

const even = n => n === 0 || (n => n === 0 ? false : even(n - 1))(n - 1);
even(1);

(n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1);

(n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1);

1 === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

1 === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

false || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

false || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

(n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

(n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(1 - 1);

(n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0);

(n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0);

0 === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0 - 1);

0 === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0 - 1);

true ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0 - 1);

true ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => n === 0 ? false : (n => n === 0 || (n => ...)(n - 1))(n - 1))(n - 1))(n - 1))(n - 1))(0 - 1);

false;

false;
"
`)
})

// source 0
test('assign undefined', () => {
  const code = `
  const a = undefined;
  a;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('undefined;')
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"const a = undefined;
a;

const a = undefined;
a;

undefined;

undefined;
"
`)
})

test('builtins return identifiers', () => {
  const code = `
  math_sin();
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('NaN;')
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"math_sin();

math_sin();

NaN;

NaN;
"
`)
})

test('negative numbers as arguments', () => {
  const code = `
  math_sin(-1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"math_sin(-1);

math_sin(-1);

-0.8414709848078965;

-0.8414709848078965;
"
`)
})

test('is_function checks for builtin', () => {
  const code = `
    is_function(is_function);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"is_function(is_function);

is_function(is_function);

true;

true;
"
`)
})

test('triple equals work on function', () => {
  const code = `
    function f() { return g(); } function g() { return f(); }
    f === f;
    g === g;
    f === g;
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"function f() {
  return g();
}
function g() {
  return f();
}
f === f;
g === g;
f === g;

function f() {
  return g();
}
function g() {
  return f();
}
f === f;
g === g;
f === g;

function g() {
  return f();
}
f === f;
g === g;
f === g;

function g() {
  return f();
}
f === f;
g === g;
f === g;

f === f;
g === g;
f === g;

f === f;
g === g;
f === g;

true;
g === g;
f === g;

true;
g === g;
f === g;

g === g;
f === g;

g === g;
f === g;

true;
f === g;

true;
f === g;

f === g;

f === g;

false;

false;
"
`)
})

test('constant declarations in blocks are protected', () => {
  const code = `
    const z = 1;

function f(g) {
    const z = 3;
    return g(z);
}

f(y => y + z);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps).toMatchSnapshot()
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchInlineSnapshot(`
"const z = 1;
function f(g) {
  const z = 3;
  return g(z);
}
f(y => y + z);

const z = 1;
function f(g) {
  const z = 3;
  return g(z);
}
f(y => y + z);

function f(g) {
  const z = 3;
  return g(z);
}
f(y => y + 1);

function f(g) {
  const z = 3;
  return g(z);
}
f(y => y + 1);

f(y => y + 1);

f(y => y + 1);

{
  const z = 3;
  return (y => y + 1)(z);
};

{
  const z = 3;
  return (y => y + 1)(z);
};

{
  return (y => y + 1)(3);
};

{
  return (y => y + 1)(3);
};

(y => y + 1)(3);

(y => y + 1)(3);

3 + 1;

3 + 1;

4;

4;
"
`)
  expect(getLastStepAsString(steps)).toEqual('4;')
})

test('function declarations in blocks are protected', () => {
  const code = `
    function repeat_pattern(n, p, r) {
    function twice_p(r) {
        return p(p(r));
    }
    return n === 0
        ? r
        : n % 2 !== 0
          ? repeat_pattern(n - 1, p, p(r))
          : repeat_pattern(n / 2, twice_p, r);
}

function plus_one(x) {
    return x + 1;
}

repeat_pattern(5, plus_one, 0);

  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('5;')
})

test('const declarations in blocks subst into call expressions', () => {
  const code = `
  const z = 1;
  function f(g) {
    const z = 3;
    return (y => z + z)(z);
  }
  f(undefined);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('6;')
})

test('scoping test for lambda expressions nested in blocks', () => {
  const code = `
  {
    const f = x => g();
    const g = () => x;
    const x = 1;
    f(0);
  }
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('scoping test for blocks nested in lambda expressions', () => {
  const code = `
  const f = x => { g(); };
  const g = () => { x; };
  const x = 1;
  f(0);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('undefined;')
})

test('scoping test for function expressions', () => {
  const code = `
  function f(x) {
    return g();
  }
  function g() {
    return x;
  }
  const x = 1;
  f(0);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('scoping test for lambda expressions', () => {
  const code = `
  const f = x => g();
  const g = () => x;
  const x = 1;
  f(0);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('scoping test for block expressions', () => {
  const code = `
  function f(x) {
    const y = x;
    return g();
  }
  function g() {
    return y;
  }
  const y = 1;
  f(0);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('scoping test for block expressions, no renaming', () => {
  const code = `
  function h(w) {
    function f(w) {
        return g();
    }
    function g() {
        return w;
    }
    return f(0);
  }
  h(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('scoping test for block expressions, with renaming', () => {
  const code = `
  function f(w) {
    return g();
  }
  function h(f) {
      function g() {
          return w;
      }
      const w = 0;
      return f(1);
  }
  h(f);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('g();')
})

test('return in nested blocks', () => {
  const code = `
  function f(x) {{ return 1; }}
  f(0);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('1;')
})

test('renaming clash test for lambda function', () => {
  const code = `
  const f = w_11 => w_10 => w_11 + w_10 + g();
  const g = () => w_10;
  const w_10 = 0;
  f(1)(2);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test('renaming clash test for functions', () => {
  const code = `
  function f(w_8) {
    function h(w_9) {
        return w_8 + w_9 + g();
    }
    return h;
}

function g() {
    return w_9;
}

const w_9 = 0;
f(1)(2);
`
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test('renaming clash in replacement for lambda function', () => {
  const code = `
  const g = () => x_1 + x_2;
  const f = x_1 => x_2 => g();
  const x_1 = 0;
  const x_2 = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('0;')
})

test(`renaming clash in replacement for function expression`, () => {
  const code = `
  function f(x_1) {
    function h(x_2) {
        return g();
    }
      return h;
  }
  function g() {
    return x_1 + x_2;
  }
  const x_1 = 0;
  const x_2 = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('0;')
})

test(`renaming clash in replacement for function declaration`, () => {
  const code = `
  function g() {
    return x_1 + x_2;
  }
  function f(x_1) {
      function h(x_2) {
          return g();
      }
      return h;
  }
  const x_1 = 0;
  const x_2 = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('0;')
})

test(`multiple clash for function declaration`, () => {
  const code = `
  function g() {
    return x_2 + x_3;
  }
  function f(x_2) {
      function h(x_3) {
          return x_4 + g();
      }
      return h;
  }
  const x_3 = 0;
  const x_2 = 2;
  const x_4 = 2;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('4;')
})

test(`multiple clash for function expression`, () => {
  const code = `
  function f(x_2) {
    function h(x_3) {
        return x_4 + g();
    }
    return h;
  }
  function g() {
      return x_2 + x_3;
  }
  const x_3 = 0;
  const x_2 = 2;
  const x_4 = 2;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('4;')
})

test(`multiple clash for lambda function`, () => {
  const code = `
  const f = x_2 => x_3 => x_4 + g();
  const g = () => x_2 + x_3;
  const x_3 = 0;
  const x_2 = 2;
  const x_4 = 2;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('4;')
})

test(`multiple clash 2 for lambda function`, () => {
  const code = `
  const f = x => x_1 => x_2 + g();
  const g = () => x + x_1;
  const x_2 = 0;
  const x_1 = 2;
  const x = 1;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test(`multiple clash 2 for function expression`, () => {
  const code = `
  function f(x) {
    function h(x_1) {
        return x_2 + g();
    }
    return h;
  }
  function g() {
      return x + x_1;
  }
  const x_2 = 0;
  const x_1 = 2;
  const x = 1;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test(`multiple clash 2 for function declaration`, () => {
  const code = `
  function g() {
    return x + x_1;
  }
  function f(x) {
      function h(x_1) {
          return x_2 + g();
      }
      return h;
  }
  const x_2 = 0;
  const x_1 = 2;
  const x = 1;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test(`renaming clash with declaration in replacement for function declaration`, () => {
  const code = `
  function g() {
    const x_2 = 2;
    return x_1 + x_2 + x;
  }

  function f(x) {
      function h(x_1) {
          return x + g();
      }
        return h;
  }

  const x_1 = 0;
  const x = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('3;')
})

test(`renaming clash with declaration in replacement for function expression`, () => {
  const code = `
  function f(x) {
    function h(x_1) {
        return g();
    }
      return h;
  }

  function g() {
      const x_2 = 2;
      return x_1 + x_2 + x;
  }

  const x_1 = 0;
  const x = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('2;')
})

test(`renaming clash with declaration in replacement for lambda function`, () => {
  const code = `
  const f = x => x_1 => g();
  const g = () => { const x_2 = 2; return x_1 + x + x_2; };
  const x = 0;
  const x_1 = 0;
  f(1)(1);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('2;')
})

test(`renaming clash with parameter of lambda function declaration in block`, () => {
  const code = `
  const g = () => x_1;
  const f = x_1 => {
      const h = x_2 => x_1 + g();
      return h;
  };

  const x_1 = 1;
  f(3)(2);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('4;')
})

test(`renaming clash with parameter of function declaration in block`, () => {
  const code = `
  function g() {
    return x_1;
  }
  function f (x_1) {
      function h(x_2) {
          return x_1 + g();
      }
      return h;
  }
  const x_1 = 1;
  f(3)(2);
  `
  const program = parse(code, mockContext())!
  const steps = getEvaluationSteps(program, mockContext(), 1000)
  expect(steps.map(x => codify(x[0])).join('\n')).toMatchSnapshot()
  expect(getLastStepAsString(steps)).toEqual('4;') 
})