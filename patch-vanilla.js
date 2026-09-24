  function BumpsDelPedido() {
    if (orderBumps.length === 0 && complementosAgregados.length === 0) return null;
    return (
      <section className="lp-cart-bumps" aria-label="Ofertas especiales del checkout">
        <div className="lp-cart-bumps-head">
          <span><Zap size={14} /> Oferta especial del checkout</span>
          <small>Complementos útiles para esta compra</small>
        </div>

        {complementosAgregados.length > 0 && (
          <div className="lp-cart-bumps-agregados">
            {complementosAgregados.map(it => (
              <div key={it.clave} className="lp-cart-bump-added">
                <span><Check size={14} /> Agregado: {it.ofertaNombre || it.nombre}</span>
                <button type="button" onClick={() => onQuitar(it.clave)}>Quitar</button>
              </div>
            ))}
          </div>
        )}

        {orderBumpsVisibles.map(({ item, oferta }) => {
          const detalle = textoBump(item, oferta);
          const imagenOferta = detalle.imagen || item.imagen;
          const bumpCompleto = ofertaCheckoutPublicable(item, oferta);
          const beneficios = normalizarBeneficiosOferta(oferta?.beneficios);
          return (
            <article key={oferta.id} className="lp-cart-bump">
              <div className="lp-cart-bump-media">
                {imagenOferta ? <img src={getMediaUrl(imagenOferta)} alt="" /> : <ImageOff size={16} />}
              </div>
              <div className="lp-cart-bump-info">
                <h4>{detalle.titulo}</h4>
                {detalle.descripcion && <p>{detalle.descripcion}</p>}
                {beneficios.length > 0 && (
                  <ul className="lp-cart-bump-benefits">
                    {beneficios.map(beneficio => (
                      <li key={beneficio}><Check size={12} /> {beneficio}</li>
                    ))}
                  </ul>
                )}
                <div className="lp-cart-bump-price">
                  {detalle.ahorro > 0 && <del>{formatPrecio(detalle.precioNormal)}</del>}
                  <strong>{bumpCompleto ? `+${formatPrecio(detalle.precioFinal)}` : 'Completá precio e imagen'}</strong>
                  {detalle.ahorro > 0 && (
                    <span>
                      {`Ahorrás ${formatPrecio(detalle.ahorro)}${detalle.ahorroPorcentaje ? ` (${detalle.ahorroPorcentaje}%)` : ''}`}
                    </span>
                  )}
                </div>
                <SelectorVarianteOferta oferta={oferta} />
                <button
                  type="button"
                  className="lp-cart-bump-add"
                  onClick={() => onAgregarSugerencia(item, oferta, componenteVarianteDe(oferta))}
                  disabled={!bumpCompleto}
                >
                  {bumpCompleto ? `Agregar por +${formatPrecio(detalle.precioFinal)}` : 'Completá producto, imagen y precio'}
                </button>
              </div>
            </article>
          );
        })}

        {orderBumpsOcultos > 0 && (
          <button type="button" className="lp-cart-bumps-more" onClick={() => setMostrarBumpsExtra(true)}>
            Ver {orderBumpsOcultos} complemento{orderBumpsOcultos === 1 ? '' : 's'} adicional{orderBumpsOcultos === 1 ? '' : 'es'}
          </button>
        )}
      </section>
    );
  }
