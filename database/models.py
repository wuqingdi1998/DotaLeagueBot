from sqlalchemy import Column, Integer, String, BigInteger, DateTime, func, ForeignKey, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import Enum as PgEnum
import enum

class SessionStatus(enum.Enum):
    OPEN = "OPEN"
    ACTIVE = "ACTIVE"
    FINISHED = "FINISHED"

class PlayerStatus(enum.Enum):
    REGISTERED = "REGISTERED"
    CHECKED_IN = "CHECKED_IN"
    PLAYING = "PLAYING"
    BENCHED = "BENCHED"

class Base(DeclarativeBase):
    pass

class Team(Base):
    __tablename__ = 'teams'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role_id = Column(BigInteger, nullable=True)
    channel_id = Column(BigInteger, nullable=True)

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
    internal_rating = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=True)
    team = relationship("Team", back_populates="players")
    registrations = relationship(
        "LeagueRegistration",
        back_populates="player",
        cascade="all, delete-orphan"
    )
    last_season_update = Column(Integer, default=1)
    nick_changes_used = Column(Integer, default=0)
    role_changes_used = Column(Integer, default=0)


class LeagueSession(Base):
    __tablename__ = 'league_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    season_number = Column(Integer, default=1)
    week_number = Column(Integer, nullable=False)

    status = Column(String, default=SessionStatus.OPEN.value)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_current = Column(Boolean, default=True)

    registrations = relationship("LeagueRegistration", back_populates="session")

    start_time = Column(DateTime, nullable=True)

class LeagueRegistration(Base):
    __tablename__ = 'league_registrations'

    id = Column(Integer, primary_key=True, autoincrement=True)

    player_id = Column(BigInteger, ForeignKey('players.discord_id'), nullable=False)

    session_id = Column(Integer, ForeignKey('league_sessions.id'), nullable=False)

    mmr_snapshot = Column(Integer, nullable=True)

    chosen_role = Column(String, nullable=True)

    status = Column(String, default=PlayerStatus.REGISTERED.value)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("Player", back_populates="registrations")

    session = relationship("LeagueSession", back_populates="registrations")

    is_checked_in = Column(Boolean, default=False)

    screenshot_url = Column(String, nullable=True)
