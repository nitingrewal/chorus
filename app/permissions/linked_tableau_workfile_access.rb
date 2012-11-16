class LinkedTableauWorkfileAccess < AdminFullAccess
  def show?(linked_tableau_workfile)
    WorkspaceAccess.new(context).can? :show, linked_tableau_workfile.workspace
  end
end