import { ContentTypeMetaData } from '../../../types';

export enum SampleContentType {
  HERO_BANNER = 'heroBanner',
  PRODUCT_SLIDER = 'productSlider',
  RICH_TEXT = 'richText',
}

export const sampleContentTypeRegistry: Record<string, ContentTypeMetaData> = {
  [SampleContentType.HERO_BANNER]: {
    type: SampleContentType.HERO_BANNER,
    name: 'Hero Banner',
    icon: '🖼️',
    isBuiltIn: true,
    defaultProperties: {
      title: 'Hero Title',
      subtitle: 'Hero Subtitle',
      imageUrl: '',
      ctaText: 'Learn More',
      ctaUrl: '#',
    },
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        defaultValue: 'Hero Title',
        required: true,
      },
      subtitle: {
        type: 'string',
        label: 'Subtitle',
        defaultValue: 'Hero Subtitle',
      },
      imageUrl: {
        type: 'file',
        extensions: ['jpg', 'jpeg', 'png'],
        label: 'Image URL',
      },
      ctaText: {
        type: 'string',
        label: 'CTA Text',
        defaultValue: 'Learn More',
      },
      ctaUrl: {
        type: 'string',
        label: 'CTA URL',
        defaultValue: '#',
      },
    },
  },
  [SampleContentType.PRODUCT_SLIDER]: {
    type: SampleContentType.PRODUCT_SLIDER,
    name: 'Product Slider',
    icon: '🛒',
    isBuiltIn: true,
    defaultProperties: {
      title: 'Featured Products',
      skus: [],
      autoplay: true,
      slidesToShow: 4,
    },
    propertySchema: {
      title: {
        type: 'string',
        label: 'Title',
        defaultValue: 'Featured Products',
        required: true,
      },
      skus: {
        type: 'array',
        label: 'Product SKUs',
        defaultValue: [],
      },
      autoplay: {
        type: 'boolean',
        label: 'Autoplay',
        defaultValue: true,
      },
      slidesToShow: {
        type: 'number',
        label: 'Slides to Show',
        defaultValue: 4,
      },
    },
  },
  [SampleContentType.RICH_TEXT]: {
    type: SampleContentType.RICH_TEXT,
    name: 'Rich Text Editor',
    icon: '📝',
    isBuiltIn: true,
    defaultProperties: {
      content: '<p>Enter your content here...</p>',
    },
    propertySchema: {
      content: {
        type: 'string', // HTML content stored as string, to be edited with WYSIWYG in the CMS
        label: 'Content',
        defaultValue: '<p>Enter your content here...</p>',
        required: true,
      },
    },
  },
};
