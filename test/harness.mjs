// Minimal local harness that runs Pipedream components outside Pipedream:
// it binds app methods, stubs $.service.db, $emit and the action `$` object.
import appDef from "../components/job_opportunities_api/job_opportunities_api.app.mjs";

export function makeApp(apiKey) {
  const app = {
    $auth: {
      api_key: apiKey,
    },
  };
  for (const [
    name,
    fn,
  ] of Object.entries(appDef.methods)) app[name] = fn.bind(app);
  for (const [
    name,
    def,
  ] of Object.entries(appDef.propDefinitions)) {
    if (typeof def.options === "function") app[`_options_${name}`] = def.options.bind(app);
  }
  return app;
}

export function makeDb(initial = {}) {
  const store = {
    ...initial,
  };
  return {
    store,
    get: (k) => store[k],
    set: (k, v) => {
      store[k] = v;
    },
  };
}

export function makeDollar() {
  const exports = {};
  return {
    exports,
    export: (k, v) => {
      exports[k] = v;
    },
  };
}

/** Instantiate a source or action with props (defaults applied) and bound methods. */
export function instantiate(component, {
  apiKey = "test_key", props = {}, db = makeDb(),
} = {}) {
  const emitted = [];
  const inst = {
    app: makeApp(apiKey),
    db,
    emitted,
    $emit: (event, meta) => emitted.push({
      event,
      meta,
    }),
  };
  for (const [
    name,
    def,
  ] of Object.entries(component.props || {})) {
    if (name === "app" || name === "db" || name === "timer") continue;
    if (def && typeof def === "object" && "default" in def) inst[name] = def.default;
  }
  Object.assign(inst, props);
  for (const [
    name,
    fn,
  ] of Object.entries(component.methods || {})) inst[name] = fn.bind(inst);
  if (component.hooks) {
    inst.hooks = {};
    for (const [
      name,
      fn,
    ] of Object.entries(component.hooks)) inst.hooks[name] = fn.bind(inst);
  }
  inst.run = component.run.bind(inst);
  return inst;
}
