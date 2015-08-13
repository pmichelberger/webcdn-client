var url = "ws://localhost:9000?id=" + window.webcdn_uuid;
var ws = createWebsocket();

/**
 * Statistics module 
 * @constructor 
 */
var Statistics = {};

/**
 * Register current peer to the mediator server
 * @static
 */
Statistics.addHost = function() {
    var data = {
        "uuid": window.webcdn_uuid,
        "active": true
    };
    if (window.performance && window.performance.timing) {
        data.performance = {};
        data.performance.timing = window.performance.timing.toJSON();
    }
    Statistics.sendMessage("host:add", data);
};

/**
 * Remove current peer from the mediator server
 * @static
 */
Statistics.removeHost = function() {
    var data = {
        "uuid": window.webcdn_uuid
    };
    Statistics.sendMessage("host:remove", data);
};

/**
 * Send message to the mediator server
 * @param {String} type - message type 
 * @param {Object} data - message payload 
 * @static
 */
Statistics.sendMessage = function(type, data) {
    var message = {
        type: type,
        data: data
    };
    ws.send(JSON.stringify(message));
};

/**
 * Request timing information for website's resources.
 * @param {String} name - resource name e.g. URL 
 * @static
 */
Statistics.queryResourceTiming = function(name) {
    if (!('performance' in window) ||
        !('getEntriesByType' in window.performance) ||
        !(window.performance.getEntriesByType('resource') instanceof Array)
    ) {
        // API not supported
    } else {
        // API supported. Hurray!   
        var timings = window.performance.getEntriesByName(name);

        if (timings && timings[0]) {
            var data = {
                name: timings[0].name,
                initiatorType: timings[0].initiatorType,
                entryType: timings[0].entryType,
                fetchStart: timings[0].fetchStart,
                responseStart: timings[0].responseStart,
                responseEnd: timings[0].responseEnd,
                duration: timings[0].duration,
                startTime: timings[0].startTime,
                uuid: window.webcdn_uuid
            };
            Statistics.sendMessage('resource_timing', data);
        }
    }
};

/** 
 * Sets performance timing mark
 * @param {String} name - mark's name 
 * @static
 */
Statistics.mark = function(name) {
    if (window.performance && window.performance.mark) {
        window.performance.mark(name);
    }
};

/**
 * Iterates over all timing marks, computes the respective measures and sends them to the mediator.
 * @static
 */

Statistics.measure = function() {
    window.performance.getEntriesByType('mark').forEach(function(mark) {
        var arr = mark.name.split(":");
        var type = arr[0];
        var id = arr[1];
        if (type === "pc_connect_start") {
            window.performance.measure("pc_connect_duration:" + id, "pc_connect_start:" + id, "pc_connect_end:" + id);
        }
        if (type === "lookup_start") {
            window.performance.measure("lookup_duration:" + id, "lookup_start:" + id, "lookup_end:" + id);
        }
        if (type === "fetch_start") {
            window.performance.measure("fetch_duration:" + id, "fetch_start:" + id, "fetch_end:" + id);
        }
    });
    var measures = window.performance.getEntriesByType('measure');

    measures.forEach(function(measure) {
        var arr = measure.name.split(":");
        var type = arr[0];
        var hash = arr[1];
        var data = {
            uuid: window.webcdn_uuid,
            hash: hash,
            duration: measure.duration
        };
        Statistics.sendMessage(type, data);
    });
};

function createWebsocket()  {
    var ws = new WebSocket(url);

    ws.onclose = function(event) {
        console.log("WebSocket.onclose", event);
    };

    ws.onerror = function(event) {
        console.log("WebSocket.onerror", event);
    };

    ws.onmessage = function(event) {
        var msg = JSON.parse(event.data);
    };

    ws.onopen = function(event) {
        Statistics.addHost();
        Statistics.queryResourceTiming();
    };

    return ws;
};

module.exports = Statistics;
