var controller, model, view;

model = {
  data: {},
  set: function(props) {
    $.extend(true, this.data, props);
    return AutoHUD.view.render(this.getAll());
  },
  get: function(prop) {
    return this.data[prop];
  },
  getAll: function() {
    return this.data;
  }
};

view = {
  templates: {},
  render: function(nextProps) {
    var i, len, ref, section;
    if (_.isEqual({}, this.templates)) {
      return;
    }
    ref = this.C.sections;
    for (i = 0, len = ref.length; i < len; i++) {
      section = ref[i];
      if ((this.lastProps != null) && _.isEqual(this.lastProps[section], nextProps[section])) {
        continue;
      }
      $("#" + section + "-wrapper").html(this.templates[section]({
        d: nextProps
      }));
    }
    return this.lastProps = $.extend(true, {}, nextProps);
  },
  makeTemplates: function() {
    var i, len, ref, results, section;
    ref = this.C.sections;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      section = ref[i];
      results.push(this.templates[section] = _.template($("#" + section + "-template").html()));
    }
    return results;
  }
};

controller = {
  setWatchers: function() {
    this.watchTime();
    this.watchWeather();
    return this.watchSubwayStatus();
  },
  watchTime: function() {
    return this.timeWatcher = setInterval((function(_this) {
      return function() {
        return _this.setTime();
      };
    })(this), 1000);
  },
  setTime: function() {
    var d, minutes, month, seconds;
    d = new Date();
    minutes = d.getMinutes();
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    seconds = d.getSeconds();
    if (seconds < 10) {
      seconds = "0" + seconds;
    }
    month = this.C.months[d.getMonth()];
    return this.model.set({
      time: (d.getHours()) + ":" + minutes + ":" + seconds,
      date: month + " " + (d.getDate()) + ", " + (d.getFullYear())
    });
  },
  watchWeather: function() {
    this.getWeather();
    return setInterval((function(_this) {
      return function() {
        return _this.getWeather();
      };
    })(this), this.C.weatherPollTime);
  },
  getWeather: function() {
    var url;
    url = "" + this.C.weatherUrl + (this.model.get("forecastioApiKey")) + "/" + (this.model.get("forecastioLatLong"));
    return $.getJSON(url + "?callback=?", (function(_this) {
      return function(data) {
        return _this.formatWeather(data);
      };
    })(this));
  },

  /*
  	Format weather data from forecast.io into something a little more simple:
  	current: 75º, rain
  	today: 65º-77º, rain in the afternoon
   */
  formatWeather: function(data) {
    var today, weather;
    weather = {
      current: {},
      today: {}
    };
    weather.current.temperature = this.formatTemperature(data.currently.apparentTemperature);
    weather.current.summary = data.currently.summary;
    weather.current.icon = data.currently.icon;
    today = data.daily.data[0];
    weather.today.low = this.formatTemperature(today.temperatureMin);
    weather.today.high = this.formatTemperature(today.temperatureMax);
    weather.today.summary = today.summary.replace(/\.$/, "");
    weather.today.icon = today.icon;
    return this.model.set({
      weather: weather
    });
  },
  formatTemperature: function(temperature) {
    temperature = Math.round(temperature);
    return temperature + "ºF";
  },
  watchSubwayStatus: function() {
    this.getSubwayStatus();
    return setInterval((function(_this) {
      return function() {
        return _this.getSubwayStatus();
      };
    })(this), this.C.subwayPollTime);
  },
  getSubwayStatus: function() {
    return $.ajax(this.C.subwayUrl, {
      type: "GET",
      dataType: "xml",
      success: (function(_this) {
        return function(data) {
          return _this.parseSubwayStatus(data);
        };
      })(this)
    });
  },
  parseSubwayStatus: function(data) {
    var i, len, line, name, ref, status, subwayStatus;
    subwayStatus = {};
    if (!data || !$(data).length) {
      return;
    }
    ref = $(data).find("service subway line");
    for (i = 0, len = ref.length; i < len; i++) {
      line = ref[i];
      line = $(line);
      name = line.find("name");
      status = line.find("status");
      if (!name.length || !status.length) {
        continue;
      }
      name = name.text();
      status = status.text();
      if (!this.C.subwayLinesToShow[name]) {
        continue;
      }
      subwayStatus[name] = status;
    }
    return this.model.set({
      subwayStatus: subwayStatus
    });
  }
};

window.AutoHUD = {
  versionPollTime: 5000,
  model: model,
  view: view,
  controller: controller,
  init: function(params) {
    console.log(params);
    this.C = params.C;
    this.model.view = this.view;
    this.model.controller = this.controller;
    this.model.C = params.C;
    this.view.model = this.model;
    this.view.controller = this.controller;
    this.view.C = params.C;
    this.controller.model = this.model;
    this.controller.view = this.view;
    this.controller.C = params.C;
    this.model.set(params);
    this.view.makeTemplates();
    if (params.version == null) {
      window.location.reload();
    } else {
      this.version = params.version;
    }
    this.versionWatcher = setInterval((function(_this) {
      return function() {
        return _this.fetchVersion();
      };
    })(this), this.versionPollTime);
    return this.controller.setWatchers();
  },
  fetchVersion: function() {
    return $.ajax("/version", {
      type: "GET",
      success: (function(_this) {
        return function(data) {
          return _this.parseVersion(data);
        };
      })(this),
      error: (function(_this) {
        return function() {
          return console.log("no response from the version watcher; the server must be down.");
        };
      })(this)
    });
  },
  parseVersion: function(data) {
    if (data.version == null) {
      return;
    }
    if (data.version !== this.version) {
      return window.location.reload();
    }
  }
};
