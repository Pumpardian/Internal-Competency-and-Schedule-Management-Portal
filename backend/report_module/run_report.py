from pathlib import Path
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib.backends.backend_pdf import PdfPages
import seaborn as sns
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func, extract

from dependencies import get_db
from models import Skill, EmployeeSkill, Booking


reports_dir = Path("./reports")
reports_dir.mkdir(exist_ok=True)


def get_skills_in_demand(db: Session, limit: int = 5) -> pd.DataFrame:
    """
    Получение топа из N наиболее востребованных навыков
    """
    skills = db.execute(select(
        Skill.name,
        Skill.category,
        func.count(EmployeeSkill.employee_id).label("employee_count"))
            .join(EmployeeSkill, Skill.id == EmployeeSkill.skill_id)
            .group_by(Skill.id, Skill.name, Skill.category)
    ).all()
    
    df = pd.DataFrame(skills, columns=["skill_name", "category", "employee_count"])
    df_top = (df
              .sort_values('employee_count', ascending=False)
              .head(limit)
              .reset_index(drop=True))
    
    return df_top


def get_average_meeting_room_occupancy(db: Session) -> pd.DataFrame:
    """
    Расчёт средней загрузки переговорной по дням недели
    """
    daily_bookings = db.execute(select(
        extract('dow', Booking.start_time).label("weekday"),
        func.date(Booking.start_time).label("booking_date"),
        func.count(Booking.id).label("booking_count"),
        func.sum(func.extract('epoch', Booking.end_time - Booking.start_time) / 3600).label("occupation_time"))
            .group_by(extract('dow', Booking.start_time), func.date(Booking.start_time))
            .order_by(func.date(Booking.start_time).desc())
    ).all()

    df = pd.DataFrame(daily_bookings, columns=[
            'weekday', 'booking_date', 'bookings_count', 'occupation_time'
        ])
    
    weekdays = {
                0: 'Понедельник', 1: 'Вторник', 2: 'Среда',
                3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье'
            }
    df['weekday_name'] = df['weekday'].map(weekdays)

    weekday_stats = df.groupby(['weekday', 'weekday_name'], as_index=False).agg({
            'booking_date': 'count',
            'bookings_count': 'sum',
            'occupation_time': ['mean']
        }).round(2)
    
    weekday_stats.columns = [
        'weekday', 
        'weekday_name', 
        'days_with_bookings', 
        'total_bookings', 
        'avg_occupation_hours'
    ]

    return weekday_stats


def visualize_skill_data(skill_data: pd.DataFrame) -> plt.Figure:
    """
    Построение столбчатой диаграммы топ-N востребованных навыков
    """
    # Проверка на пустые данные
    if skill_data.empty:
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'Нет данных для отображения', 
                ha='center', va='center', fontsize=16)
        ax.set_title('Топ навыков', fontsize=14, fontweight='bold')
        plt.tight_layout()
        return fig

    fig, ax = plt.subplots(figsize=(10, 6))

    #Создание столбцов с цветами по категориям
    categories = skill_data['category'].unique()
    colors = sns.color_palette("viridis", len(categories))
    color_map = {cat: color for cat, color in zip(categories, colors)}
    bar_colors = [color_map[cat] for cat in skill_data['category']]
    
    bars = ax.bar(
        skill_data['skill_name'],
        skill_data['employee_count'],
        color=bar_colors,
        edgecolor='black',
        linewidth=1
    )

    #Настройка графика
    ax.set_title(f'Топ-{len(skill_data)} наиболее востребованных навыков', 
                fontsize=14, fontweight='bold')
    ax.set_xlabel('Навык', fontsize=12)
    ax.set_ylabel('Количество сотрудников', fontsize=12)
    ax.grid(axis='y', alpha=0.3, linestyle='--')

    # Подписи значений на столбцах
    for bar, value in zip(bars, skill_data['employee_count']):
        ax.text(
            bar.get_x() + bar.get_width()/2.,
            bar.get_height() + 0.1,
            f'{int(value)}',
            ha='center',
            va='bottom',
            fontsize=10,
            fontweight='bold'
        )

    #Легенда по категориям
    legend_elements = [Patch(facecolor=color_map[cat], label=cat) 
                      for cat in categories]
    ax.legend(handles=legend_elements, title='Категория', 
             loc='upper right', framealpha=0.9)
    
    plt.tight_layout()
    return fig


def visualize_meeting_room_data(meeting_room_stats: pd.DataFrame) -> plt.Figure:
    """
    Построение столбчатой диаграммы средней загрузки переговорной по дням недели
    """
    # Проверка на пустые данные
    if meeting_room_stats.empty:
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'Нет данных для отображения', 
                ha='center', va='center', fontsize=16)
        ax.set_title('Загрузка переговорной', fontsize=14, fontweight='bold')
        plt.tight_layout()
        return fig

    # Извлечение данных
    df_plot = meeting_room_stats.copy()
    
    # Проверка наличия колонки с названием дня недели
    if 'weekday_name' not in df_plot.columns:
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'Нет данных по дням недели', 
                ha='center', va='center', fontsize=16)
        ax.set_title('Загрузка переговорной', fontsize=14, fontweight='bold')
        plt.tight_layout()
        return fig
    
    # Проверка наличия колонки со средним временем
    if 'avg_occupation_hours' not in df_plot.columns:
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, 'Нет данных по загрузке', 
                ha='center', va='center', fontsize=16)
        ax.set_title('Загрузка переговорной', fontsize=14, fontweight='bold')
        plt.tight_layout()
        return fig

    # Сортировка по дням недели
    day_order = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
    df_plot['weekday_name'] = pd.Categorical(df_plot['weekday_name'], categories=day_order, ordered=True)
    df_plot = df_plot.sort_values('weekday_name')

    # Создание графика
    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.bar(
        df_plot['weekday_name'], 
        df_plot['avg_occupation_hours'],
        color=sns.color_palette("viridis", len(df_plot)),
        edgecolor='black',
        linewidth=1
    )

    # Настройка графика
    ax.set_title('Средняя загрузка переговорной по дням недели', fontsize=14, fontweight='bold')
    ax.set_xlabel('День недели', fontsize=12)
    ax.set_ylabel('Среднее время занятости (часы)', fontsize=12)
    ax.grid(axis='y', alpha=0.3, linestyle='--')

    # Подписываем значения на столбцах
    for bar, value in zip(bars, df_plot['avg_occupation_hours']):
        ax.text(
            bar.get_x() + bar.get_width()/2., 
            bar.get_height() + 0.1,
            f'{value:.1f} ч',
            ha='center', 
            va='bottom',
            fontsize=10,
            fontweight='bold'
        )
    
    plt.tight_layout()
    return fig


def generate_report(fmt: str) -> None:
    """
    Запуск рассчета и сохранения аналитических данных
    """
    db: Session = next(get_db())

    try:
        skills_df = get_skills_in_demand(db, 5)
        occupancy_df = get_average_meeting_room_occupancy(db)

        skills_fig = visualize_skill_data(skills_df)
        occupancy_fig = visualize_meeting_room_data(occupancy_df)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        path_skills = reports_dir / f"analytics_report_skills{timestamp}.{fmt}"
        path_occupancy = reports_dir / f"analytics_report_occupancy{timestamp}.{fmt}"

        skills_fig.savefig(path_skills, dpi=300, bbox_inches='tight', format=fmt)
        occupancy_fig.savefig(path_occupancy, dpi=300, bbox_inches='tight', format=fmt)
    except Exception as e:
        print(f"\Ошибка: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_report("pdf")
    generate_report("png")