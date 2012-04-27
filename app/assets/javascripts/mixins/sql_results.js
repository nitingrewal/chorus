chorus.Mixins.SQLResults = {
    getRows : function() {
        return this.get("rows");
    },

    getColumns : function() {
        return this.get("columns");
    },

    getErrors : function() {
        return this.attributes;
    },

    getColumnLabel : function(columnName) {
        return columnName;
    },

    getSortedRows : function(rows) {
        return rows;
    },

    columnOrientedData: function() {

        var columns = this.getColumns();
        var rows = this.getSortedRows(this.getRows());

        var self = this;
        return _.map(columns, function (column) {
            var name = column.name;
            return {
                name: self.getColumnLabel(name),
                type:column.typeCategory,
                values:_.pluck(rows, name)
            };
        });
    },

    dataStatusOk: function(data) {
        if (data.response && data.response.state == "failed") {
            return false
        } else {
            return this._super("dataStatusOk", arguments);
        }
    },

    dataErrors: function(data) {
        if (data.message && data.message.length) {
            return data.message
        }

        if (data.response && data.response.result) {
            return [data.response.result];
        }
    },

    errorMessage:function () {
        return this.serverErrors && this.serverErrors[0] && this.serverErrors[0].message;
    }
};
