require "spec_helper"

describe WorkspaceAccess do
  let(:non_member) { users(:alice) }
  let(:admin) { users(:admin) }
  let(:member) { users(:carly) }
  let(:owner) { users(:bob) }
  let(:workspace) { workspaces(:bob_public) }
  let(:private_workspace) { workspaces(:bob_private) }
  let(:workspace_access) {
    controller = WorkspacesController.new
    stub(controller).current_user { user }
    WorkspaceAccess.new(controller)
  }

  let(:user) { non_member }

  describe ".workspaces_for" do
    context "user is admin" do
      it "returns unscoped workspaces" do
        mock(Workspace).scoped

        described_class.workspaces_for(admin)
      end
    end

    context "user is not admin" do
      it "returns limited workspaces" do
        mock(Workspace).accessible_to(user)

        described_class.workspaces_for(user)
      end
    end
  end

  describe ".members_for" do
    let(:workspace) { Object.new }

    context "user is admin" do
      it "returns all members" do
        mock(workspace).members

        described_class.members_for(admin, workspace)
      end
    end

    context "user is not admin" do
      it "calls workspace.members_accessible_to" do
        mock(workspace).members_accessible_to(user)
        described_class.members_for(user, workspace)
      end
    end
  end

  describe "#show?" do
    context "in a public workspace" do
      it "always allows access" do
        workspace_access.can?(:show, workspace).should be_true
      end
    end

    context "in a private workspace" do
      it "forbids access when the user is not a member nor admin" do
        workspace_access.can?(:show, private_workspace).should be_false
      end

      context "for a member" do
        let(:user) { member }
        it "allows access" do
          workspace_access.can?(:show, private_workspace).should be_true
        end
      end
    end
  end

  describe "#can_edit_sub_objects?" do
    it "doesn't allow non-members to edit workspace sub objects'" do
      workspace_access.can?(:can_edit_sub_objects, private_workspace).should be_false
    end

    context "for a member" do
      let(:user) { member }

      it "allows them to edit workspace sub objects" do
        workspace_access.can?(:can_edit_sub_objects, private_workspace).should be_true
      end

      it "does not allow archived workspace to have its sub objects edited" do
        private_workspace.archived_at = Time.current
        workspace_access.can?(:can_edit_sub_objects, private_workspace).should be_false
      end
    end
  end

  describe "#update?" do
    it "doesn't allow non-members to edit'" do
      workspace_access.can?(:update, workspace).should be_false
    end

    context "for members" do
      let(:user) { member }
      it "allows edit of name and summary" do
        workspace.attributes = {:name => 'aardvark', :summary => 'not a summary'}
        workspace_access.can?(:update, workspace).should be_true
      end

      it "does not allow edit of other attributes" do
        workspace.attributes = {:public => false}
        workspace_access.can?(:update, workspace).should be_false
      end
    end

    context "for owners" do
      let(:user) { owner }
      it "allows the owner to edit anything" do
        workspace.attributes = {:public => false}
        workspace_access.can?(:update, workspace).should be_true
      end

      context "with an updated sandbox" do
        context "when user can show_contents? of the dataset instance" do
          it "allows update" do
            schema = gpdb_schemas(:other_schema)
            any_instance_of(InstanceAccess) do |instance_access|
              mock(instance_access).show_contents?(schema.instance) { true }
            end
            workspace.sandbox_id = schema.id
            workspace_access.can?(:update, workspace).should be_true
          end
        end

        context "when user can not show_contents? of the dataset instance" do
          it "does not allow update" do
            schema = gpdb_schemas(:other_schema)
            any_instance_of(InstanceAccess) do |instance_access|
              mock(instance_access).show_contents?(schema.instance) { false }
            end
            workspace.sandbox_id = schema.id
            workspace_access.can?(:update, workspace).should be_false
          end
        end
      end
    end
  end
end
