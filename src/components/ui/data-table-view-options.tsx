import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ColumnFiltersState, Table as TanstackTable } from '@tanstack/react-table';

interface DataTableViewOptionsProps<T> {
  table: TanstackTable<T>;
}

export function DataTableViewOptions<T>({ table }: DataTableViewOptionsProps<T>) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 py-4">
      <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <div className="relative w-full">
          <Input
            placeholder="Filtrar por nombre"
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm pl-9"          
          />
      </div>

      </div>
    </div>
  );
}