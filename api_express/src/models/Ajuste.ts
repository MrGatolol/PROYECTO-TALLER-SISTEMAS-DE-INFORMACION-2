import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, AutoIncrement } from "sequelize-typescript";
import Producto from "./Producto";
import Usuario from "./Usuario";

@Table({ tableName: "AJUSTES", timestamps: false })
export default class Ajuste extends Model<Ajuste> {
  
  // Fix: profe Catherine pidio correlativo numerico
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.INTEGER, allowNull: false, field: "cod_ajuste" })
  cod_ajuste!: number;

  @ForeignKey(() => Producto)
  @Column({ type: DataType.STRING(10), allowNull: false, field: "cod_producto" })
  cod_producto!: string;

  // Fix: Agregamos quien hizo el ajuste
  @ForeignKey(() => Usuario)
  @Column({ type: DataType.STRING(10), allowNull: false, field: "rut_usuario" })
  rut_usuario!: string;

  @Column({ type: DataType.TINYINT, allowNull: false, field: "tipo" })
  tipo!: number; // 0: Incremento, 1: Reducción

  @Column({ type: DataType.DATE, allowNull: false, field: "fecha" })
  fecha!: Date;

  @Column({ type: DataType.STRING(255), allowNull: true, field: "descripcion" })
  descripcion?: string;

  @Column({ type: DataType.INTEGER, allowNull: false, field: "ajuste_stock" })
  ajuste_stock!: number;
  
  @BelongsTo(() => Producto, "cod_producto")
  producto?: Producto;

  @BelongsTo(() => Usuario, "rut_usuario")
  usuario?: Usuario;
}