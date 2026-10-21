import { PageRenderer } from '../../page-builder/core/PageRenderer';
import { registerLegacyBlocks } from '../../page-builder/blocks/legacyBlocks';

// Aparte y con lazy() desde TiendaPaginaView: los bloques legacy arrastran
// framer-motion y el resto del page-builder, que una tienda "lienzo en
// blanco" no usa y no tiene por qué descargar.
registerLegacyBlocks();

export default function PaginaBloquesTienda({ context }) {
  return <PageRenderer context={context} />;
}
