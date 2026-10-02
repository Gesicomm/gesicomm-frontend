import React from 'react';
import RichText from './RichText';

export { RichText };

/**
 * Alias de RichText que acepta el texto como `content` (así lo usan las
 * preguntas frecuentes de las landings) o como `text` (la prop de RichText).
 *
 * Antes era `FormattedText = RichText` a secas: RichText solo lee `text`, y
 * todos los que llamaban con `content` recibían un componente vacío — las
 * respuestas de las preguntas frecuentes nunca se mostraban al abrirlas.
 */
export function FormattedText({ content, text, ...rest }) {
  return <RichText text={text ?? content} {...rest} />;
}

export default RichText;
