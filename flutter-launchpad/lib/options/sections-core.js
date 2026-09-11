'use strict';
// Core config sections (identity → foundation → networking → UI). Pure data.
// Field types: text | seg (single-choice segmented) | chips (multi) | switch.

const opt = (value, label) => ({ value, label: label != null ? label : value });

const coreSections = [
  {
    id: 'identity',
    title: 'Identity',
    note: 'What the app is called and where it lives.',
    fields: [
      { type: 'text', key: 'appName', label: 'App name (snake_case)', help: 'Dart package name — lowercase_with_underscores.' },
      { type: 'text', key: 'orgId', label: 'Organization ID', help: 'Reverse-DNS bundle prefix, e.g. com.example.' },
    ],
  },
  {
    id: 'foundation',
    title: 'Foundation',
    note: 'The convention stack. Structured modes lock in the house rules.',
    fields: [
      {
        type: 'seg',
        key: 'mode',
        label: 'Mode',
        help: 'structured-* modes encode the conventions (general_exports barrel, ApiRequest, AppKeys, strict lints). generic is vanilla Flutter.',
        opts: [opt('structured-getx', 'Structured · GetX'), opt('structured-riverpod', 'Structured · Riverpod'), opt('generic', 'Generic')],
      },
      {
        type: 'seg',
        key: 'stateMgmt',
        label: 'State management',
        opts: [opt('getx', 'GetX'), opt('riverpod', 'Riverpod'), opt('bloc', 'BLoC'), opt('provider', 'Provider'), opt('none', 'None')],
      },
      {
        type: 'seg',
        key: 'architecture',
        label: 'Architecture',
        help: 'Structured modes always use feature folders. In Generic mode, MVC/MVVM/Clean emit a real wired sample.',
        opts: [
          opt('feature-folder', 'Feature folders'),
          opt('layer-folder', 'Layer folders'),
          opt('clean', 'Clean'),
          opt('mvc', 'MVC'),
          opt('mvvm', 'MVVM'),
        ],
      },
      {
        type: 'switch',
        key: 'proBase',
        label: 'Professional base layer',
        help: 'DI (get_it), Dio client + interceptors, Result/Failure/ErrorHandler, BaseRepository/UseCase, network_info.',
      },
      {
        type: 'seg',
        key: 'modelsCodegen',
        label: 'API models',
        help: 'Always emits ApiResponse<T>/PaginatedResponse<T>/ApiError. Choose how your typed models are generated.',
        opts: [opt('manual', 'Manual fromJson'), opt('freezed', 'freezed + json_serializable')],
      },
      {
        type: 'seg',
        key: 'navigation',
        label: 'Navigation',
        opts: [opt('named-routes', 'Named routes (GetX)'), opt('go_router', 'GoRouter')],
      },
    ],
  },
  {
    id: 'networking',
    title: 'Networking & data',
    fields: [
      {
        type: 'seg',
        key: 'apiClient',
        label: 'API client',
        help: 'Structured modes ship one hand-rolled ApiRequest wrapping Dio — no codegen.',
        opts: [opt('api_request', 'ApiRequest (Dio)'), opt('dio', 'Dio'), opt('retrofit', 'Retrofit'), opt('http', 'http')],
      },
      { type: 'chips', key: 'connectivity', label: 'Connectivity', opts: [opt('connectivity_plus'), opt('internet_connection_checker_plus')] },
      {
        type: 'seg',
        key: 'localization',
        label: 'Localization',
        opts: [opt('none', 'None'), opt('intl', 'intl'), opt('flutter_localization', 'flutter_localization')],
      },
    ],
  },
  {
    id: 'ui',
    title: 'UI & theming',
    fields: [
      { type: 'chips', key: 'themes', label: 'Themes', opts: [opt('light'), opt('dark'), opt('dynamic', 'Dynamic (flex_color_scheme)')] },
      {
        type: 'chips',
        key: 'interactivity',
        label: 'Interactivity & animation',
        opts: [opt('pull-refresh', 'Pull to refresh'), opt('infinite-scroll', 'Infinite scroll'), opt('shimmer', 'Skeleton/shimmer'), opt('hero', 'Hero transitions'), opt('page-transitions', 'Page transitions'), opt('animations', 'Custom animations')],
      },
      {
        type: 'chips',
        key: 'components',
        label: 'Components',
        opts: [
          opt('cached_network_image', 'Cached images'),
          opt('flutter_svg', 'SVG'),
          opt('flutter_smart_dialog', 'Smart dialog'),
          opt('bottom_sheet', 'Bottom sheet'),
          opt('date_picker', 'Date picker'),
          opt('image_attach', 'Image attach (picker)'),
          opt('file_download', 'File download + open'),
          opt('pdf', 'PDF viewer'),
          opt('share', 'Share (text/link/file)'),
          opt('state_widgets', 'Empty/error/loading states'),
          opt('form_validators', 'Form validators'),
          opt('switchers', 'Theme + language switchers'),
        ],
      },
    ],
  },
];

module.exports = { coreSections };
