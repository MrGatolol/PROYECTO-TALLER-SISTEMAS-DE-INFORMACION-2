import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import Cliente from "./Cliente";
import Usuario from "./Usuario";
import DetallePedido from "./DetallePedido";

@Table({ tableName: "PEDIDO", timestamps: false })
export default class Pedido extends Model<Pedido> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER, allowNull: false, field: "cod_pedido" })
  cod_pedido!: number;

  @ForeignKey(() => Usuario)
  @Column({ type: DataType.STRING(10), allowNull: false, field: "rut_usuario" })
  rut_usuario!: string;

  @ForeignKey(() => Cliente)
  @Column({ type: DataType.STRING(10), allowNull: false, field: "rut_cliente" })
  rut_cliente!: string;

  @Column({ type: DataType.DATE, allowNull: false, field: "fecha" })
  fecha!: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, field: "total" })
  total!: number;

  // --- AGREGAR ESTO ---
  @Column({ type: DataType.STRING(50), allowNull: true, field: "medio_pago" })
  medio_pago?: string;
  // --------------------

  @BelongsTo(() => Usuario, "rut_usuario")
  usuario?: Usuario;

  @BelongsTo(() => Cliente, "rut_cliente")
  cliente?: Cliente;

  @HasMany(() => DetallePedido, "cod_pedido")
  detalles?: DetallePedido[];
}