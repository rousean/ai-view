import { createDataSourceId } from '@schema/index';
import type { DataSource } from '@schema/types';
import type { Command } from '../command-registry';

export interface DataSourceAddPayload {
  source: Omit<DataSource, 'id'> & { id?: string };
}

export interface DataSourceUpdatePayload {
  id: string;
  patch: Partial<DataSource>;
}

export interface DataSourceRemovePayload {
  id: string;
}

export const dataSourceAddCommand: Command<DataSourceAddPayload> = {
  type: 'dataSource.add',
  label: '添加数据源',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const id = payload.source.id ?? createDataSourceId();
    draft.dataSources.push({ ...payload.source, id } as DataSource);
  },
};

export const dataSourceUpdateCommand: Command<DataSourceUpdatePayload> = {
  type: 'dataSource.update',
  label: '修改数据源',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    const idx = draft.dataSources.findIndex((d) => d.id === payload.id);
    if (idx < 0) return;
    draft.dataSources[idx] = {
      ...draft.dataSources[idx],
      ...payload.patch,
      id: payload.id,
    } as DataSource;
  },
};

export const dataSourceRemoveCommand: Command<DataSourceRemovePayload> = {
  type: 'dataSource.remove',
  label: '删除数据源',
  undoable: true,
  apply: (draft, _ctx, payload) => {
    draft.dataSources = draft.dataSources.filter((d) => d.id !== payload.id);
    // Detach bindings from widgets that referenced this source.
    for (const page of draft.pages) {
      for (const w of page.widgets) {
        if (w.dataBinding?.sourceId === payload.id) {
          delete w.dataBinding;
        }
      }
    }
  },
};

export const dataSourceCommands: Command<any>[] = [
  dataSourceAddCommand,
  dataSourceUpdateCommand,
  dataSourceRemoveCommand,
];
