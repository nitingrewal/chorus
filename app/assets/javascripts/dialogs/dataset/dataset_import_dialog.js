chorus.dialogs.DatasetImport = chorus.dialogs.Base.extend({
    constructorName: "DatasetImport",

    templateName: "dataset_import",
    title: t("dataset.import.title"),

    events: {
        "change input:radio": "onRadioSelect",
        "submit form": "uploadFile",
        "click button.submit": "uploadFile",
        "click a.dataset_picked": "launchDatasetPickerDialog"
    },

    launchDatasetPickerDialog: function(e) {
        e.preventDefault();
        if (!this.saving) {
            var datasetDialog = new chorus.dialogs.ImportDatasetsPicker({
                workspaceId: this.options.launchElement.data("workspace-id")
            });
            this.bindings.add(datasetDialog, "datasets:selected", this.datasetsChosen, this);
            this.launchSubModal(datasetDialog);
        }
    },

    datasetsChosen: function(dataset) {
        this.selectedDataset = dataset[0];
        this.changeSelectedDataset(dataset && dataset[0] && dataset[0].name());
    },

    onRadioSelect: function(e) {
        this.$(".new_table input:text").prop("disabled", true);
        this.$(".existing_table select").prop("disabled", true);
        this.$(".existing_table .options").addClass('hidden');
        this.$(".existing_table .options input").prop("disabled", true);

        this.importTarget = $(e.currentTarget).val();
        if (this.importTarget == "new") {
            this.$(".new_table input:text").prop("disabled", false);
            this.$("button.submit").prop("disabled", false);
            this.$("a.dataset_picked").addClass("hidden");

            if (this.selectedDataset) {
                this.$("span.dataset_picked").removeClass("hidden");
            }

        } else if (this.importTarget == "existing") {
            this.$("a.dataset_picked").removeClass("hidden");
            this.$("span.dataset_picked").addClass("hidden");

            this.$(".existing_table .options").removeClass("hidden");
            this.$(".existing_table .options input").prop("disabled", false);
        }

        this.enableButton();
    },

    changeSelectedDataset: function(name) {
        this.$(".existing_table a.dataset_picked").text(_.prune(name, 20));
        this.$(".existing_table span.dataset_picked").text(_.prune(name, 20));

        this.enableButton();
    },

    enableButton: function() {
        if (this.selectedDataset || this.importTarget !== "existing") {
            this.$("button.submit").prop("disabled", false);
        } else {
            this.$("button.submit").prop("disabled", true);
        }
    },

    additionalContext: function() {
        return {
            canonicalName: this.options.launchElement.data("canonicalName")
        }
    },

    makeModel: function() {
        this.resource = this.model = this.csv = new chorus.models.CSVImport({
            workspaceId: this.options.launchElement.data("workspaceId")
        });

        this.csvOptions = {hasHeader: true};
    },

    importDestination: function() {
        if (this.importTarget === "existing") {
            return (this.selectedDataset && this.selectedDataset.name()) || "";
        } else if (this.importTarget === "new") {
            return chorus.utilities.CsvParser.normalizeForDatabase(this.$('.new_table input:text').val());
        }
    },

    uploadFile: function(e) {
        e && e.preventDefault();

        if (this.importTarget === "workfile") {
            this.$("button.submit").startLoading("actions.uploading");
            this.uploadObj.url = "/workspace/" + this.options.launchElement.data("workspaceId") + "/workfile";
            this.uploadObj.source = "fs";
            this.request = this.uploadObj.submit();

        } else {
            this.csvOptions.tableName = this.importDestination();

            this.model.set({
                truncate: this.$(".existing_table input#truncate").is(':checked')
            }, {silent: true});

            this.$("button.submit").startLoading("actions.uploading");
            this.uploadObj.url = "/workspaces/" + this.options.launchElement.data("workspaceId") + "/csv";

            if (this.model.performValidation()) {
                this.request = this.uploadObj.submit();
            } else {
                this.showErrors(this.model);
            }
        }
    },

    modalClosed: function() {
        if (this.request) {
            this.request.abort();
        }

        this._super("modalClosed");
    },

    postRender: function() {
        var self = this;

        this.importTarget = "new"

        this.$("input[type=file]").fileupload({
            change: fileChosen,
            add: fileChosen,
            done: uploadFinished,
            dataType: "json"
        });

        function fileChosen(e, data) {
            self.$("button.submit").prop("disabled", false);
            self.$('.empty_selection').addClass('hidden');

            self.uploadObj = data;
            var filename = data.files[0].name;
            var filenameComponents = filename.split('.');
            var basename = _.first(filenameComponents);
            var extension = _.last(filenameComponents);
            self.$(".file_name").text(filename);
            self.$(".new_table input[type='text']").val(basename.toLowerCase().replace(/ /g, '_'));

            self.$("img").removeClass("hidden");
            self.$("img").attr("src", chorus.urlHelpers.fileIconUrl(extension, "medium"));

            self.$(".import_controls").removeClass("hidden");

            self.$(".file-wrapper a").removeClass("hidden");
            self.$(".file-wrapper button").addClass("hidden");

            self.$("input[type=file]").prop("title", t("dataset.import.change_file"));
        }

        function uploadFinished(e, data) {
            e && e.preventDefault();
            self.$("button.submit").stopLoading();

            if (self.importTarget === "workfile") {
                var workfile = new chorus.models.Workfile();
                workfile.set(workfile.parse(data.result), {silent: true});
                workfile.parseErrors(data.result);

                if (workfile.serverErrors) {
                    self.showErrors(workfile);
                } else {
                    chorus.toast("dataset.import.workfile_success", {fileName: workfile.get("fileName")});
                    chorus.router.navigate(workfile.hasOwnPage() ? workfile.showUrl() : workfile.workfilesUrl());
                }
            } else {
                var workingCsv = self.model.clone();
                workingCsv.set(workingCsv.parse(data.result), {silent: true});
                workingCsv.parseErrors(data.result);

                self.csvOptions.contents = workingCsv.get('contents')

                if (workingCsv.serverErrors) {
                    self.csv.serverErrors = workingCsv.serverErrors;
                    self.csv.trigger("saveFailed");
                    fileChosen(e, data);
                } else {
                    var csvParser = new chorus.utilities.CsvParser(workingCsv.get('contents'), self.csvOptions);
                    if ((csvParser.getColumnOrientedData().length === 0) && !csvParser.serverErrors) {
                        var alert = new chorus.alerts.EmptyCSV();
                        alert.launchModal();
                    } else {
                        var dialog;
                        if (self.importTarget === "existing") {
                            dialog = new chorus.dialogs.ExistingTableImportCSV({csv: workingCsv, datasetId: self.selectedDataset.get("id")});
                        } else {
                            dialog = new chorus.dialogs.NewTableImportCSV({model: workingCsv, csvOptions: self.csvOptions});
                        }
                        chorus.PageEvents.subscribe("csv_import:started", self.closeModal, self);
                        dialog.launchModal();
                    }
                }
            }
        }
    }
});
