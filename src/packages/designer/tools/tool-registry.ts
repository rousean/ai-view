import { Registry } from '../editor/registry';
import type { Tool } from './tool.interface';

export class ToolRegistry extends Registry<Tool> {
  constructor() {
    super('tools');
  }
}
