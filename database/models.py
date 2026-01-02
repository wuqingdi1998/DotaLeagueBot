from sqlalchemy import Column, Integer, String, BigInteger, DateTime, func, ForeignKey
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class Team(Base):
    __tablename__ = 'teams'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    # Сделали nullable=True, чтобы команда могла существовать без капитана
    captain_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    players = relationship("Player", back_populates="team")


class Player(Base):
    __tablename__ = 'players'
    discord_id = Column(BigInteger, primary_key=True, autoincrement=False)
    steam_id32 = Column(BigInteger, unique=True, nullable=False)
    personaname = Column(String, nullable=True)
    real_name = Column(String, nullable=True)   # Проверь запятую тут
    positions = Column(String, nullable=True)   # И тут
    avatar_url = Column(String, nullable=True)
    rank_tier = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=True)
    team = relationship("Team", back_populates="players")