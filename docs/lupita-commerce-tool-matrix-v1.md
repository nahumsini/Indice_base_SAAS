# Matriz técnica: funciones comerciales de Lupita

Fecha: 2026-10-06. Generada desde los contratos tipados del candidato local.
Cada acción tiene `preview_<action>` y `<action>`; la segunda recibe solamente la confirmación y clave de reintento.
Permiso OAuth, módulo, pestaña, rol, empresa y unidad/negocio se vuelven a validar en el backend.

| Dominio | Lecturas | Acciones confirmadas | Propietario | Pestañas reales | Consentimientos |
| --- | ---: | ---: | --- | --- | --- |
| Inventario | 9 | 12 | InventoryAssistantService | inventory.products / warehouses / inventory | inventory.read; inventory.products.manage; inventory.warehouses.manage; inventory.stock.manage; inventory.movements.create; inventory.movements.cancel |
| Venta comercial | 8 | 18 | SalesWorkflowService | crm.sales / contracts / commissions | sales.read; sales.manage; sales.collections.confirm; sales.cancel; sales.contracts.manage; sales.followups.manage; sales.commissions.manage |
| Cortes de comisión | 4 | 4 | SalesCommissionAssistantService | crm.commissions + human_resources.incentives para escritura | sales.read; sales.commissions.cut; sales.commissions.schedule + hr.incentives.manage |
| Compras | 8 | 14 | ProcurementAssistantService → PurchaseOrderService | inventory.purchase-orders / providers | inventory.read; inventory.procurement.manage; inventory.procurement.approve; inventory.procurement.receive; inventory.invoices.manage |
| Proveedores y descuentos | 5 | 6 | InventoryCatalogAssistantService → ProviderService / DiscountRuleService | inventory.providers / discounts | inventory.read; inventory.providers.manage; inventory.discounts.manage |
| Caja, stock pagado y devolución | 12 | 13 | PosAssistantService → Checkout / Shift / PaidInventoryReceipt / PosReturn owners | pos.cajas / sale / cortes | pos.read; pos.registers.manage; pos.shifts.manage; pos.cash.manage; pos.checkout; pos.inventory.receive; pos.returns.manage |
| Depósitos y pedidos | 7 | 5 | PosOperationsService → Settlement / Kiosk / Restaurant owners | pos.cortes / sale | pos.read; pos.settlements.manage; pos.orders.manage |
| Terminal y recuperación | 7 | 6 | PosTerminal owners → Square / Mercado Pago / PosReturnCoordinator | pos.sale / cortes | pos.read; pos.terminal.manage; pos.returns.manage |
| Adjuntos privados | Extiende las 2 lecturas existentes | 5 | SalesOperationalFileService / SupplierInvoiceOperationalFileService / PaidReceiptOperationalFileService | products / purchase-orders / sales / contracts / sale | files.read o files.attach + consentimiento y pestaña del destino |
| Reportes CSV/PDF | 1 | 0 | AiCommerceReportService → propietarios anteriores | Pestaña del reporte solicitado | files.read + consentimiento de lectura del dominio |

La ampliación agrega **61 lecturas y 83 acciones confirmadas**, equivalentes a 227 herramientas nuevas. El catálogo completo tiene 459 herramientas: 141 lecturas, 158 acciones con su vista previa y dos entradas de archivo. Su publicación efectiva depende del manifiesto autorizado por conexión.

La conversión de cotización requiere también quotes.read, quotes.update y autoridad vigente de esa cotización. Las comisiones siguen restringidas a root/superadmin y el corte no paga nómina. Los consentimientos de escritura nuevos permanecen desactivados por defecto.

## Inventario

Lecturas:

- `list_inventory_products`
- `get_inventory_product`
- `list_inventory_warehouses`
- `get_inventory_warehouse`
- `list_inventory_balances`
- `get_inventory_balance`
- `list_inventory_movements`
- `get_inventory_movement`
- `get_inventory_metrics`

Acciones:

- `create_inventory_product`
- `update_inventory_product`
- `inactivate_inventory_product`
- `create_inventory_warehouse`
- `update_inventory_warehouse`
- `inactivate_inventory_warehouse`
- `configure_inventory_stock`
- `receive_inventory_stock`
- `issue_inventory_stock`
- `transfer_inventory_stock`
- `count_inventory_stock`
- `cancel_inventory_movement`

## Venta comercial

Lecturas:

- `list_commercial_sales`
- `get_commercial_sale`
- `list_sales_contracts`
- `get_sales_contract`
- `list_sales_follow_ups`
- `get_sales_follow_up`
- `list_commission_rules`
- `get_commission_rule`

Acciones:

- `create_commercial_sale`
- `update_commercial_sale`
- `convert_quote_to_sale`
- `approve_sale_commercial`
- `confirm_sale_inventory`
- `confirm_sale_collection`
- `update_sale_delivery`
- `cancel_commercial_sale`
- `create_sales_contract`
- `update_sales_contract`
- `review_sales_contract`
- `cancel_sales_contract`
- `create_sales_follow_up`
- `update_sales_follow_up`
- `set_sales_follow_up_status`
- `create_commission_rule`
- `update_commission_rule`
- `set_commission_rule_status`

## Cortes de comisión

Lecturas:

- `list_sales_commission_cuts`
- `get_sales_commission_cut`
- `list_sales_commission_schedules`
- `get_sales_commission_schedule`

Acciones:

- `create_sales_commission_cut`
- `create_sales_commission_schedule`
- `update_sales_commission_schedule`
- `set_sales_commission_schedule_status`

## Compras

Lecturas:

- `list_purchase_orders`
- `get_purchase_order`
- `list_supplier_submissions`
- `get_supplier_submission`
- `list_supplier_invoices`
- `get_supplier_invoice`
- `list_product_suppliers`
- `get_product_supplier`

Acciones:

- `create_purchase_order`
- `update_purchase_order_draft`
- `request_purchase_order`
- `approve_purchase_order`
- `send_purchase_order`
- `cancel_purchase_order`
- `receive_purchase_order`
- `create_supplier_submission`
- `review_supplier_submission`
- `convert_supplier_submission`
- `submit_supplier_invoice`
- `review_supplier_invoice`
- `save_product_supplier`
- `update_product_supplier`

## Proveedores y descuentos

Lecturas:

- `list_inventory_providers`
- `get_inventory_provider`
- `list_inventory_discounts`
- `get_inventory_discount`
- `evaluate_inventory_discounts`

Acciones:

- `create_inventory_provider`
- `update_inventory_provider`
- `set_inventory_provider_status`
- `create_inventory_discount`
- `update_inventory_discount`
- `set_inventory_discount_status`

## Caja, stock pagado y devolución

Lecturas:

- `list_pos_registers`
- `get_pos_register`
- `list_pos_shifts`
- `get_pos_shift`
- `get_my_pos_shift`
- `get_pos_closing_summary`
- `list_pos_tickets`
- `get_pos_ticket`
- `list_pos_cash_movements`
- `list_pos_inventory_receipts`
- `get_pos_return`
- `recover_pos_checkout`

Acciones:

- `create_pos_register`
- `update_pos_register`
- `inactivate_pos_register`
- `open_pos_shift`
- `close_pos_shift`
- `cancel_pos_shift`
- `record_pos_cash_movement`
- `complete_pos_checkout`
- `receive_pos_inventory`
- `reverse_pos_inventory_receipt`
- `prepare_pos_return`
- `confirm_pos_cash_return`
- `cancel_pos_return`

## Depósitos y pedidos

Lecturas:

- `list_pos_closings`
- `get_pos_closing`
- `list_pos_closing_settlements`
- `list_pos_source_orders`
- `get_pos_source_order`
- `list_pos_pretickets`
- `get_pos_preticket`

Acciones:

- `confirm_pos_closing_settlement`
- `claim_pos_source_order`
- `release_pos_source_order`
- `claim_pos_preticket`
- `release_pos_preticket`

## Terminal y recuperación

Lecturas:

- `get_pos_terminal_binding`
- `get_pos_terminal_payment`
- `get_pos_terminal_payment_by_request`
- `list_pos_pending_terminal_payments`
- `get_pos_card_refund`
- `get_pos_card_refund_by_request`
- `get_pos_card_return_refund`

Acciones:

- `create_pos_terminal_payment`
- `recover_pos_terminal_payment`
- `cancel_pos_terminal_payment`
- `refund_pos_card_payment`
- `recheck_pos_card_refund`
- `confirm_pos_card_return`

## Adjuntos y reportes

Acciones adicionales:

- `attach_inventory_product_image`
- `attach_sale_payment_evidence`
- `attach_sales_contract_file`
- `attach_supplier_invoice_file`
- `attach_pos_receipt_file`

Lectura adicional: `export_commerce_report`. Extiende `list_operational_files` y `get_operational_file` con los cinco destinos comerciales.

Los reportes admitidos son inventory_products, inventory_balances, inventory_movements, purchase_orders, supplier_invoices, commercial_sales, commission_cuts, pos_tickets, pos_closings y pos_settlements.
