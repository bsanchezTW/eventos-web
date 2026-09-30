/**
 * Transworld Design System — punto de entrada isomórfico (Node y navegador).
 *
 *   Servidor:  import { Button, Card } from "../design-system/index.js";
 *   Navegador: import { Button, Card } from "/design-system/index.js";
 *
 * Comportamientos del navegador: "/design-system/behaviors/index.js".
 * Integración Express (solo Node): "./design-system/server.js".
 */
export { SafeHtml, attrs, cx, escapeHtml, html, raw, toHtml, uid } from "./utils/html.js";
export { BRAND, DS_MOUNT, dsAsset } from "./utils/assets.js";
export { Icon, iconNames } from "./icons/index.js";

export { Cluster, Container, Dot, Eyebrow, Grid, Heading, Kicker, Section, SectionHeader, Stack, Text, VisuallyHidden } from "./primitives/index.js";

export { Button, IconButton } from "./components/button.js";
export { CarouselDots, Chip, ChoiceCard, ChoiceGroup, OptionGroup, SegmentedControl } from "./components/selection.js";
export { Availability, Badge, Legend, Tag } from "./components/badge.js";
export { Card, CardLink, CodeDisplay, DateBadge, FactList, IconCircle, MapFrame, MediaFrame, StatCard, Timeline } from "./components/card.js";
export { Checkbox, Field, Input, InputGroup, SearchBar, SearchField, Select } from "./components/form.js";
export { Alert, EmptyState, Skeleton, SuccessState, Toast, ToastRegion } from "./components/feedback.js";
export { Modal } from "./components/overlay.js";
export { MonthCalendar, monthGrid } from "./components/calendar.js";

export { Document } from "./layouts/document.js";
export { Brand, SiteFooter, SiteHeader } from "./layouts/site.js";
export { Banner, CtaBand, HeroCarousel } from "./layouts/hero.js";
