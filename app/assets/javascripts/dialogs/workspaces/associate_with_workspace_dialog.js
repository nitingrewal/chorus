chorus.dialogs.AssociateWithWorkspace = chorus.dialogs.PickWorkspace.extend({
    constructorName: "AssociateWithWorkspace",

    title: t("dataset.associate.title.one"),
    submitButtonTranslationKey: "dataset.associate.button.one",

    setup: function () {
        this.requiredResources.add(this.collection);
        this._super('setup', arguments);
    },

    resourcesLoaded: function() {
        if (this.model.has("workspace")) {
            this.collection.remove(this.collection.get(this.model.workspace().id));
        }

        this.model.workspacesAssociated().each(function(workspace) {
            this.collection.remove(this.collection.get(workspace.id));
        }, this);

        this.render();
    },

    submit: function() {
        var self = this;
        var url, params;

        if(this.model.get("type") == "CHORUS_VIEW") {
            url = "/workspace/" + this.model.get("workspace").id + "/dataset/" + this.model.get("id");
            params = {
                targetWorkspaceId: this.selectedItem().get("id"),
                objectName: this.model.get("objectName")
            };
        } else {
            url = "/workspace/" + this.selectedItem().get("id") + "/dataset";
            params = {
                type: "SOURCE_TABLE",
                datasetIds: this.model.id
            };
        }
        this.$("button.submit").startLoading("actions.associating");

        $.post(url, params,
            function(data) {
                if (self.model.dataStatusOk(data)) {
                    self.model.activities().fetch();
                    self.closeModal();
                    chorus.toast("dataset.associate.toast.one", {datasetTitle: self.model.get("objectName"), workspaceNameTarget: self.selectedItem().get("name")});
                    chorus.PageEvents.broadcast("workspace:associated");
                } else {
                    self.serverErrors = data.message;
                    self.render();
                };
            }, "json");
    }
});
