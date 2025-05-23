import React, { useRef, useEffect } from 'react';

interface Props {
  baseurl?: string;
  'business-unit-key'?: string;
  'available-locales'?: string;
  locale?: string;
}

const CMSAppWrapper: React.FC<Props> = ({ ...props }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const element = document.createElement('cms-app');

      Object.entries(props).forEach(([key, value]) => {
        if (typeof value === 'string') {
          element.setAttribute(key, value);
        }
      });

      ref.current.innerHTML = '';
      ref.current.appendChild(element);
    }
  }, []);

  return (
    <div
      ref={ref}
      // override styles here
      style={
        {
          '--selector-button-selected-background': 'rgb(23 58 95)',
        } as React.CSSProperties
      }
    />
  );
};

export default CMSAppWrapper;
