import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDocumentStore } from '../stores/document-store';
import { selectWidgets } from '../stores/selectors';
import { WidgetContainer } from './widget-container';

/**
 * Iterates the current page's widget order and renders one
 * `<WidgetContainer/>` per id. Subscribes only to the *id list* (with shallow
 * comparison) so adding / removing one widget triggers exactly one rerender
 * of this layer; per-widget changes are isolated to WidgetContainer.
 */
export const WidgetLayer: React.FC = () => {
  const ids = useDocumentStore(
    useShallow((s) => selectWidgets(s).map((w) => w.id)),
  );

  return (
    <>
      {ids.map((id) => (
        <WidgetContainer key={id} id={id} />
      ))}
    </>
  );
};
