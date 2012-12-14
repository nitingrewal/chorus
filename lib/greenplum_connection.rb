require 'sequel'

module GreenplumConnection
  class InstanceUnreachable < StandardError; end

  class Base
    def initialize(details)
      @settings = details
    end

    def connect!
      @connection = Sequel.connect(db_url)

      begin
        @connection.test_connection
      rescue Sequel::DatabaseConnectionError => e
        raise InstanceUnreachable
      end
    end

    def disconnect
      @connection.disconnect if @connection
      @connection = nil
    end

    METHODS = [:username, :password, :host, :port, :database]
    METHODS.each do |meth|
      define_method(meth) { @settings[meth.to_sym] }
    end

    def connected?
      !!@connection
    end

    private

    def db_url
      query_params = URI.encode_www_form(:user => @settings[:username], :password => @settings[:password], :loginTimeout => 3)
      "jdbc:postgresql://#{@settings[:host]}:#{@settings[:port]}/#{@settings[:database]}?" << query_params
    end
  end

  class DatabaseConnection < Base
    def schemas
      connect!
      @connection.fetch(SCHEMAS_SQL).map { |row| row[:schema_name] }
    ensure
      disconnect
    end

    private

    SCHEMAS_SQL = <<-SQL
      SELECT
        schemas.nspname as schema_name
      FROM
        pg_namespace schemas
      WHERE
        schemas.nspname NOT LIKE 'pg_%'
        AND schemas.nspname NOT IN ('information_schema', 'gp_toolkit', 'gpperfmon')
      ORDER BY lower(schemas.nspname)
    SQL
  end

  class InstanceConnection < Base
    def databases
      connect!
      @connection.fetch(DATABASES_SQL).map { |row| row[:database_name] }
    ensure
      disconnect
    end

    private

    DATABASES_SQL = <<-SQL
      SELECT
        datname as database_name
      FROM
        pg_database
      WHERE
        datallowconn IS TRUE AND datname NOT IN ('postgres', 'template1')
        ORDER BY lower(datname) ASC
    SQL
  end
end