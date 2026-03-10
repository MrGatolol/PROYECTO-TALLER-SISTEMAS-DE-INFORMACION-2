import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import Producto from "./Producto";
import Pedido from "./Pedido";

@Table({ tableName: "DETALLE_PEDIDO", timestamps: false })
export default class DetallePedido extends Model<DetallePedido> {
  
// Ahora es Parte de la Clave Primaria Compuesta
  @PrimaryKey
  @ForeignKey(() => Pedido)
  @Column({ type: DataType.INTEGER, allowNull: false, field: "cod_pedido" })
  cod_pedido!: number;

  @PrimaryKey
  @ForeignKey(() => Producto)
  @Column({ type: DataType.STRING(10), allowNull: false, field: "cod_producto" })
  cod_producto!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, field: "cantidad" })
  cantidad!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, field: "precio_unitario" })
  precio_unitario!: number;

  @BelongsTo(() => Pedido, "cod_pedido")
  pedido?: Pedido;

  @BelongsTo(() => Producto, "cod_producto")
  producto?: Producto;
}


