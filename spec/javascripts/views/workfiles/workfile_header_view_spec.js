describe("chorus.views.WorkfileHeader", function() {
    beforeEach(function() {
        this.model = rspecFixtures.workfile.sql({
            tagNames: ["alpha"]
        });
        this.view = new chorus.views.WorkfileHeader({model: this.model});
    });

    describe("#render", function() {
        beforeEach(function() {
            this.view.render();
        });

        it("has tags", function() {
            expect(this.view.$('.text-tag').eq(0)).toContainText("alpha");
        });
    });
});
