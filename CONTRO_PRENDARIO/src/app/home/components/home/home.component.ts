import { Component, inject } from '@angular/core';
import { SidebarComponent } from "../../../pages/components/sidebar/sidebar.component";
import { HeaderComponent } from "../../../pages/components/header/header.component";
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PrestamoService } from '../../../prestamos/services/prestamo.service';
import { MovimientoService } from '../../../movimientos/services/movimiento.service';
import { PagoService } from '../../../pagos/services/pago.service';
import { LogoutButtonComponent } from "../../../pages/components/logout-button/logout-button.component";
import { UsuariosCrearComponent } from "../../../admin/components/usuarios-crear/usuarios-crear.component";

interface ResumenNegocio {
  dineroFluyendo: number;
  dineroDisponible: number;
  prestamosVencidos: any[];
  interesesGenerados: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SidebarComponent, HeaderComponent, RouterModule, LogoutButtonComponent, UsuariosCrearComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  
  private prestamoService = inject(PrestamoService);
  private movimientoService = inject(MovimientoService);

  resumen: ResumenNegocio = {
    dineroFluyendo: 0,
    dineroDisponible: 0,
    prestamosVencidos: [],
    interesesGenerados: 0
  };

  loading = true;
  error = '';

  ngOnInit() {
    this.cargarResumen();
  }

  private cargarResumen() {
    // Cargar préstamos activos
    this.prestamoService.getPrestamos().subscribe({
      next: (prestamos) => {
        this.loading = false;
        const prestamosActivos = prestamos.filter(p => p.estadoPrestamo === 'ACTIVO');
        this.resumen.dineroFluyendo = prestamosActivos.reduce((total, p) => total + p.montoPrestamo, 0);
        
        // Filtrar préstamos vencidos
        this.resumen.prestamosVencidos = prestamos
        .filter(p => {
          if (!p.fechaVencimiento) return false;
          const fechaVencimiento = new Date(p.fechaVencimiento);
          const ahora = new Date();
          return (fechaVencimiento < ahora && p.estadoPrestamo === 'ACTIVO') || 
          p.estadoPrestamo === 'VENCIDO';
        })
        .sort((a, b) => {
          const fechaA = new Date(a.fechaVencimiento!).getTime();
          const fechaB = new Date(b.fechaVencimiento!).getTime();
          return fechaB - fechaA; // Ordenar por fecha de vencimiento más reciente
        })
        .slice(0, 3); // Tomar solo los 3 primeros
    },
    error: (error) => {
      this.error = 'Error al cargar los préstamos';
      this.loading = false;
      console.error('Error:', error);
    }
  });

    // Cargar balance de movimientos
    this.movimientoService.obtenerBalance().subscribe({
      next: (balance) => {
        this.resumen.dineroDisponible = balance.total;
      },
      error: (error) => {
        console.error('Error al cargar el balance:', error);
      }
    });
  }

  formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount);
  }

  getDisponiblePercentage(): number {
    if (this.resumen.dineroFluyendo === 0) return 0;
    const percentage = (this.resumen.dineroDisponible / this.resumen.dineroFluyendo) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Limitar entre 0 y 100
  }

  getDiasVencidos(fechaVencimiento: string): number {
    const fechaVenc = new Date(fechaVencimiento);
    const hoy = new Date();
    const diferencia = hoy.getTime() - fechaVenc.getTime();
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  }

}