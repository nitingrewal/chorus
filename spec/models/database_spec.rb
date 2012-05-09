require 'spec_helper'

describe Database do
  context "#from_instance_account" do
    it "returns all the databases on the connection" do
      instance = FactoryGirl.build(:instance, :id => 123)
      account = FactoryGirl.build(:instance_account, :instance => instance)
      fake_connection = mock(Object.new).query("select datname from pg_database") do
          [["db_one"], ["db_two"], ["db_three"], ["db_four"]]
      end.subject
      mock(Gpdb::ConnectionBuilder).connect!(instance, account) {|_, _, block| block.call(fake_connection) }

      databases = Database.from_instance_account(account)

      databases.length.should == 4
      databases.map {|db| db.name }.should == ["db_one", "db_two", "db_three", "db_four"]
      databases.map {|db| db.instance_id }.should == [123, 123, 123, 123]
    end
  end
end
