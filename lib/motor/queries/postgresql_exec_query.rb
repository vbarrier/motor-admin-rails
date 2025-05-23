# frozen_string_literal: true

module Motor
  module Queries
    module PostgresqlExecQuery
      module_function

      def call(conn, statement)
        if Rails.version.to_f >= 8.0
          result = conn.send(:internal_execute, *statement)
          process_result(conn, result)
        else
          conn.send(:execute_and_clear, *statement) do |result|
            process_result(conn, result)
          end
        end
      end

      def process_result(conn, result)
        types = {}
        fields = result.fields

        fields.each_with_index do |fname, i|
          ftype = result.ftype i
          fmod  = result.fmod i
          types[fname] = conn.send(:get_oid_type, ftype, fmod, fname)
        end

        if conn.respond_to?(:build_result, true)
          conn.send(:build_result, columns: fields, rows: result.values, column_types: types)
        else
          ActiveRecord::Result.new(fields, result.values, types)
        end
      end
    end
  end
end
