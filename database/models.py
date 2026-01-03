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
    ingame_name = Column(String, nullable=False)
    real_name = Column(String, nullable=True)
    positions = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    rank_tier = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=True)
    team = relationship("Team", back_populates="players")