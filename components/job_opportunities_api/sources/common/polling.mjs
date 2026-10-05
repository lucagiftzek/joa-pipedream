import { DEFAULT_POLLING_SOURCE_TIMER_INTERVAL } from "@pipedream/platform";
import app from "../../job_opportunities_api.app.mjs";

export default {
  props: {
    app,
    db: "$.service.db",
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: DEFAULT_POLLING_SOURCE_TIMER_INTERVAL,
      },
    },
  },
  methods: {
    _get(key) {
      return this.db.get(key);
    },
    _set(key, value) {
      this.db.set(key, value);
    },
    /** max_page_size of the connected key, cached for a day so polls do not call /v1/me every time. */
    async _pageSize() {
      const cached = this._get("pageSize");
      if (cached?.value && Date.now() - cached.at < 24 * 3600 * 1000) return cached.value;
      const value = await this.app.getMaxPageSize();
      this._set("pageSize", {
        value,
        at: Date.now(),
      });
      return value;
    },
  },
};
