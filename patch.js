  function BumpsDelPedido({ esCheckout }) {
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
              <div key={it.clave} className={`lp-cart-bump is-checked ${esCheckout ? 'is-compact' : ''}`}>
                <div className="lp-cart-bump-header lp-cart-bump-header--checked">
                  <Check size={14} /> OFERTA AGREGADA
                </div>
                <div className="lp-cart-bump-body">
                  <div className="lp-cart-bump-media">
                    {it.imagen ? <img src={getMediaUrl(it.imagen)} alt="" /> : <ImageOff size={16} />}
                  </div>
                  <div className="lp-cart-bump-info-checked">
                    <strong className="lp-cart-bump-title">{it.ofertaNombre || it.nombre}</strong>
                    <div className="lp-cart-bump-checked-actions">
                      <strong className="lp-cart-bump-price-added">+{formatPrecio(it.precio * it.cantidad)}</strong>
                      <button type="button" className="lp-cart-bump-remove" onClick={() => onQuitar(it.clave)}>Quitar</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {orderBumpsVisibles.map(({ item, oferta }) => {
          const detalle = textoBump(item, oferta);
          const imagenOferta = detalle.imagen || item.imagen;
          const bumpCompleto = ofertaCheckoutPublicable(item, oferta);
          
          const tituloFlag = detalle.ahorro > 0
            ? (esCheckout ? `⚡ Agregá esto con ${formatPrecio(detalle.ahorro)} OFF` : `⚡ OFERTA EXCLUSIVA · AHORRÁ ${formatPrecio(detalle.ahorro)}`)
            : '⚡ OFERTA EXCLUSIVA';

          return (
            <article key={oferta.id} className={`lp-cart-bump ${!bumpCompleto ? 'is-disabled' : ''} ${esCheckout ? 'is-compact' : ''}`}>
              <div className="lp-cart-bump-header">
                {tituloFlag}
              </div>
              <div className="lp-cart-bump-body">
                <div className="lp-cart-bump-media">
                  {imagenOferta ? <img src={getMediaUrl(imagenOferta)} alt="" /> : <ImageOff size={16} />}
                </div>
                <div className="lp-cart-bump-info">
                  <h4 className="lp-cart-bump-title">{detalle.titulo}</h4>
                  <div className="lp-cart-bump-price-block">
                    <strong>{bumpCompleto ? `+${formatPrecio(detalle.precioFinal)}` : 'Incompleto'}</strong>
                    {detalle.ahorro > 0 && <del>{formatPrecio(detalle.precioNormal)}</del>}
                  </div>
                  <SelectorVarianteOferta oferta={oferta} />
                </div>
              </div>
              <div className="lp-cart-bump-footer">
                <button
                  type="button"
                  className="lp-cart-bump-add"
                  onClick={() => onAgregarSugerencia(item, oferta, componenteVarianteDe(oferta))}
                  disabled={!bumpCompleto}
                >
                  {bumpCompleto ? `+ AGREGAR A MI PEDIDO` : 'Faltan datos'}
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
